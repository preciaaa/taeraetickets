"""
Flink job for batch similarity checking of ticket embeddings
This job processes new embeddings from Kafka and compares them against all existing embeddings
to detect duplicate or similar tickets.
"""

import os
import sys
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import KafkaSource, KafkaOffsetsInitializer
from pyflink.common.serialization import SimpleStringSchema
from pyflink.datastream.window import TumblingProcessingTimeWindows
from pyflink.common.time import Time
import json
import logging
import numpy as np
from typing import List, Dict, Any
import faiss
import pickle
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimilarityChecker:
    def __init__(self, faiss_index_path: str = "embeddings_index.faiss", 
                 metadata_path: str = "embeddings_metadata.pkl"):
        self.faiss_index_path = faiss_index_path
        self.metadata_path = metadata_path
        self.index = None
        self.metadata = []
        self.load_index()
    
    def load_index(self):
        """Load existing FAISS index and metadata"""
        try:
            if os.path.exists(self.faiss_index_path):
                self.index = faiss.read_index(self.faiss_index_path)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
            else:
                # Create new index if it doesn't exist
                self.index = faiss.IndexFlatL2(2048)  # For ResNet50 embeddings
                logger.info("Created new FAISS index")
            
            if os.path.exists(self.metadata_path):
                with open(self.metadata_path, 'rb') as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded metadata for {len(self.metadata)} embeddings")
            else:
                self.metadata = []
                logger.info("No existing metadata found")
                
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            raise
    
    def save_index(self):
        """Save FAISS index and metadata"""
        try:
            faiss.write_index(self.index, self.faiss_index_path)
            with open(self.metadata_path, 'wb') as f:
                pickle.dump(self.metadata, f)
            logger.info("Saved FAISS index and metadata")
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise
    
    def add_embedding(self, embedding: np.ndarray, metadata: Dict[str, Any]):
        """Add new embedding to index"""
        try:
            self.index.add(embedding.reshape(1, -1))
            self.metadata.append(metadata)
            logger.info(f"Added embedding for ticket: {metadata.get('ticket_id', 'unknown')}")
        except Exception as e:
            logger.error(f"Error adding embedding: {str(e)}")
            raise
    
    def find_similar(self, embedding: np.ndarray, threshold: float = 0.8, top_k: int = 10) -> List[Dict[str, Any]]:
        """Find similar embeddings above threshold"""
        try:
            if self.index.ntotal == 0:
                return []
            
            # Search for similar embeddings
            distances, indices = self.index.search(embedding.reshape(1, -1), min(top_k, self.index.ntotal))
            
            similar_tickets = []
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx == -1:  # No more results
                    break
                
                # Convert distance to similarity score (0-1)
                similarity_score = 1.0 / (1.0 + distance)
                
                if similarity_score >= threshold:
                    ticket_metadata = self.metadata[idx]
                    similar_tickets.append({
                        'ticket_id': ticket_metadata.get('ticket_id'),
                        'similarity_score': similarity_score,
                        'distance': float(distance),
                        'metadata': ticket_metadata
                    })
            
            return similar_tickets
            
        except Exception as e:
            logger.error(f"Error finding similar embeddings: {str(e)}")
            return []

class EmbeddingProcessor:
    """Flink function to process embedding messages"""
    
    def __init__(self):
        self.similarity_checker = SimilarityChecker()
        self.producer = None  # Will be initialized in open()
    
    def open(self, runtime_context):
        """Initialize Kafka producer for sending similarity alerts"""
        from kafka import KafkaProducer
        import json
        
        self.producer = KafkaProducer(
            bootstrap_servers='localhost:9092',
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None
        )
        logger.info("Initialized Kafka producer for similarity alerts")
    
    def process(self, value: str) -> List[str]:
        """Process embedding message and check for similarities"""
        try:
            # Parse message
            message = json.loads(value)
            ticket_id = message.get('ticket_id')
            embedding = np.array(message.get('embedding'))
            metadata = message.get('metadata', {})
            
            logger.info(f"Processing embedding for ticket: {ticket_id}")
            
            # Add embedding to index
            self.similarity_checker.add_embedding(embedding, metadata)
            
            # Find similar tickets
            similar_tickets = self.similarity_checker.find_similar(embedding, threshold=0.8)
            
            # Send similarity alerts if found
            if similar_tickets:
                alert_payload = {
                    'ticket_id': ticket_id,
                    'similar_tickets': similar_tickets,
                    'similarity_score': similar_tickets[0]['similarity_score'],
                    'timestamp': str(datetime.now())
                }
                
                # Send to similarity_alerts topic
                future = self.producer.send('similarity_alerts', 
                                          value=alert_payload, 
                                          key=ticket_id)
                future.get(timeout=10)
                
                logger.warning(f"SIMILARITY ALERT: Ticket {ticket_id} has {len(similar_tickets)} similar tickets")
            
            # Save index periodically
            self.similarity_checker.save_index()
            
            return [f"Processed ticket {ticket_id} with {len(similar_tickets)} similar tickets found"]
            
        except Exception as e:
            logger.error(f"Error processing embedding: {str(e)}")
            return [f"Error processing embedding: {str(e)}"]
    
    def close(self):
        """Clean up resources"""
        if self.producer:
            self.producer.close()
        logger.info("Closed Kafka producer")

def create_flink_job():
    """Create and configure Flink job"""
    
    # Set up Flink environment
    env = StreamExecutionEnvironment.get_execution_environment()
    
    # Set parallelism
    env.set_parallelism(1)  # Single thread for now
    
    # Configure Kafka source
    kafka_source = KafkaSource.builder() \
        .set_bootstrap_servers("localhost:9092") \
        .set_topics("embedding_results") \
        .set_group_id("flink-similarity-group") \
        .set_starting_offsets(KafkaOffsetsInitializer.earliest()) \
        .set_value_only_deserializer(SimpleStringSchema()) \
        .build()
    
    # Create processing pipeline
    stream = env.from_source(kafka_source, KafkaOffsetsInitializer.earliest(), "Kafka Source")
    
    # Process embeddings with windowing for batch processing
    processed_stream = stream \
        .window_all(TumblingProcessingTimeWindows.of(Time.seconds(30))) \
        .process(EmbeddingProcessor())
    
    # Add sink (optional - for logging)
    processed_stream.print("Processed")
    
    return env

def run_flink_job():
    """Run the Flink similarity checking job"""
    try:
        env = create_flink_job()
        job_name = "Ticket Similarity Checker"
        env.execute(job_name)
    except Exception as e:
        logger.error(f"Error running Flink job: {str(e)}")
        raise

if __name__ == "__main__":
    run_flink_job() 