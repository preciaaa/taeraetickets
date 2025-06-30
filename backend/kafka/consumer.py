from kafka import KafkaConsumer
import json
import logging
import io
from PIL import Image
import torch
from typing import Dict, Any
import sys
import os

# Add the services directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseKafkaConsumer:
    def __init__(self, topic: str, group_id: str, bootstrap_servers='localhost:9092'):
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            auto_offset_reset='earliest',
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            enable_auto_commit=True,
            auto_commit_interval_ms=1000
        )
        self.topic = topic
        logger.info(f"Initialized consumer for topic: {topic}, group: {group_id}")
    
    def process_message(self, message):
        """Override this method in subclasses"""
        raise NotImplementedError
    
    def run(self):
        """Main consumer loop"""
        try:
            for message in self.consumer:
                try:
                    logger.info(f"Processing message from topic {self.topic}: {message.key}")
                    self.process_message(message.value)
                    logger.info(f"Successfully processed message: {message.key}")
                except Exception as e:
                    logger.error(f"Error processing message {message.key}: {str(e)}")
                    # Continue processing other messages
                    continue
        except KeyboardInterrupt:
            logger.info("Shutting down consumer...")
        finally:
            self.consumer.close()

class EmbeddingConsumer(BaseKafkaConsumer):
    def __init__(self):
        super().__init__('ticket_uploads', 'embedding-group')
        # Import here to avoid circular imports
        from services.image-embedding-service.model import get_resnet_model, transform
        from services.image-embedding-service.index_faiss import add_embedding
        
        self.model = get_resnet_model()
        self.transform = transform
        self.add_embedding = add_embedding
        logger.info("Embedding consumer initialized")
    
    def process_message(self, payload: Dict[str, Any]):
        """Process ticket image and extract embedding"""
        try:
            ticket_id = payload.get('ticket_id', 'unknown')
            image_bytes = bytes.fromhex(payload['image'])
            
            # Process image
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            input_tensor = self.transform(image).unsqueeze(0)
            
            with torch.no_grad():
                embedding = self.model(input_tensor).squeeze().numpy()
            
            # Store embedding
            metadata = payload.get('metadata', {})
            metadata['ticket_id'] = ticket_id
            self.add_embedding(embedding, metadata)
            
            logger.info(f"Successfully processed embedding for ticket: {ticket_id}")
            
        except Exception as e:
            logger.error(f"Failed to process embedding: {str(e)}")
            raise

class OCRConsumer(BaseKafkaConsumer):
    def __init__(self):
        super().__init__('ticket_uploads', 'ocr-group')
        import pytesseract
        self.pytesseract = pytesseract
        logger.info("OCR consumer initialized")
    
    def process_message(self, payload: Dict[str, Any]):
        """Process ticket image and extract text"""
        try:
            ticket_id = payload.get('ticket_id', 'unknown')
            image_bytes = bytes.fromhex(payload['image'])
            
            # Process image
            image = Image.open(io.BytesIO(image_bytes))
            text = self.pytesseract.image_to_string(image)
            
            # Calculate confidence (basic implementation)
            confidence = self._calculate_confidence(text)
            
            logger.info(f"Successfully extracted text for ticket: {ticket_id}")
            logger.info(f"Extracted text: {text[:100]}...")  # Log first 100 chars
            
            # Here you could send the result to another Kafka topic or store in database
            # For now, we'll just log it
            
        except Exception as e:
            logger.error(f"Failed to process OCR: {str(e)}")
            raise
    
    def _calculate_confidence(self, text: str) -> float:
        """Calculate confidence score for OCR result"""
        if not text.strip():
            return 0.0
        
        # Simple confidence calculation based on text length and character diversity
        text_length = len(text.strip())
        unique_chars = len(set(text.lower()))
        
        # Basic heuristic: longer text with more diverse characters = higher confidence
        confidence = min(1.0, (text_length * unique_chars) / 1000)
        return confidence

class SimilarityAlertConsumer(BaseKafkaConsumer):
    def __init__(self):
        super().__init__('similarity_alerts', 'alert-group')
        logger.info("Similarity alert consumer initialized")
    
    def process_message(self, payload: Dict[str, Any]):
        """Process similarity alerts"""
        try:
            ticket_id = payload.get('ticket_id')
            similar_tickets = payload.get('similar_tickets', [])
            similarity_score = payload.get('similarity_score', 0.0)
            
            logger.warning(f"SIMILARITY ALERT: Ticket {ticket_id} has {len(similar_tickets)} similar tickets")
            logger.warning(f"Similarity score: {similarity_score}")
            logger.warning(f"Similar tickets: {similar_tickets}")
            
            # Here you could:
            # 1. Send email/SMS alerts
            # 2. Flag the ticket for manual review
            # 3. Store alert in database
            # 4. Trigger fraud detection workflow
            
        except Exception as e:
            logger.error(f"Failed to process similarity alert: {str(e)}")
            raise

def run_embedding_consumer():
    """Run the embedding consumer"""
    consumer = EmbeddingConsumer()
    consumer.run()

def run_ocr_consumer():
    """Run the OCR consumer"""
    consumer = OCRConsumer()
    consumer.run()

def run_similarity_alert_consumer():
    """Run the similarity alert consumer"""
    consumer = SimilarityAlertConsumer()
    consumer.run()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python consumer.py [embedding|ocr|alert]")
        sys.exit(1)
    
    consumer_type = sys.argv[1]
    
    if consumer_type == "embedding":
        run_embedding_consumer()
    elif consumer_type == "ocr":
        run_ocr_consumer()
    elif consumer_type == "alert":
        run_similarity_alert_consumer()
    else:
        print("Invalid consumer type. Use: embedding, ocr, or alert")
        sys.exit(1)