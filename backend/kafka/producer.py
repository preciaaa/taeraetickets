from kafka import KafkaProducer
import json
import logging
from typing import Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TicketKafkaProducer:
    def __init__(self, bootstrap_servers='localhost:9092'):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            retries=3,
            acks='all'
        )
        self.topics = {
            'ticket_uploads': 'ticket_uploads',
            'ocr_results': 'ocr_results', 
            'embedding_results': 'embedding_results',
            'similarity_alerts': 'similarity_alerts'
        }
    
    def send_ticket_upload(self, image_data: bytes, metadata: Dict[str, Any], ticket_id: str):
        """Send ticket image for processing"""
        try:
            payload = {
                'ticket_id': ticket_id,
                'image': image_data.hex(),
                'metadata': metadata,
                'timestamp': str(datetime.now())
            }
            
            future = self.producer.send(
                self.topics['ticket_uploads'], 
                value=payload,
                key=ticket_id
            )
            future.get(timeout=10)  # Wait for send confirmation
            logger.info(f"Successfully sent ticket {ticket_id} for processing")
            
        except Exception as e:
            logger.error(f"Failed to send ticket {ticket_id}: {str(e)}")
            raise
    
    def send_ocr_result(self, ticket_id: str, text: str, confidence: float):
        """Send OCR processing result"""
        try:
            payload = {
                'ticket_id': ticket_id,
                'text': text,
                'confidence': confidence,
                'timestamp': str(datetime.now())
            }
            
            future = self.producer.send(
                self.topics['ocr_results'],
                value=payload,
                key=ticket_id
            )
            future.get(timeout=10)
            logger.info(f"Successfully sent OCR result for ticket {ticket_id}")
            
        except Exception as e:
            logger.error(f"Failed to send OCR result for ticket {ticket_id}: {str(e)}")
            raise
    
    def send_embedding_result(self, ticket_id: str, embedding: list, metadata: Dict[str, Any]):
        """Send embedding processing result"""
        try:
            payload = {
                'ticket_id': ticket_id,
                'embedding': embedding,
                'metadata': metadata,
                'timestamp': str(datetime.now())
            }
            
            future = self.producer.send(
                self.topics['embedding_results'],
                value=payload,
                key=ticket_id
            )
            future.get(timeout=10)
            logger.info(f"Successfully sent embedding result for ticket {ticket_id}")
            
        except Exception as e:
            logger.error(f"Failed to send embedding result for ticket {ticket_id}: {str(e)}")
            raise
    
    def send_similarity_alert(self, ticket_id: str, similar_tickets: list, similarity_score: float):
        """Send similarity alert when duplicate/similar tickets are detected"""
        try:
            payload = {
                'ticket_id': ticket_id,
                'similar_tickets': similar_tickets,
                'similarity_score': similarity_score,
                'timestamp': str(datetime.now())
            }
            
            future = self.producer.send(
                self.topics['similarity_alerts'],
                value=payload,
                key=ticket_id
            )
            future.get(timeout=10)
            logger.info(f"Sent similarity alert for ticket {ticket_id}")
            
        except Exception as e:
            logger.error(f"Failed to send similarity alert for ticket {ticket_id}: {str(e)}")
            raise
    
    def close(self):
        """Close the producer"""
        self.producer.close()

# Global producer instance
producer = TicketKafkaProducer()

def send_ticket_payload(payload):
    """Legacy function for backward compatibility"""
    producer.send_ticket_upload(
        image_data=bytes.fromhex(payload['image']),
        metadata=payload['metadata'],
        ticket_id=payload.get('ticket_id', 'unknown')
    )