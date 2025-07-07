from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors import FlinkKafkaConsumer, FlinkKafkaProducer
from pyflink.common.serialization import SimpleStringSchema
from pyflink.common.time import Time
from pyflink.datastream.window import TumblingProcessingTimeWindows
from pyflink.common.typeinfo import Types
from pyflink.datastream.functions import MapFunction, KeyedProcessFunction, RuntimeContext
from pyflink.datastream.state import ValueStateDescriptor
import json
from datetime import datetime, timedelta
import hashlib
from typing import Dict, List, Tuple


class TicketData:
    def __init__(self, image_url: str, user_id: str, fingerprint: str, metadata: dict, timestamp: str):
        self.image_url = image_url
        self.user_id = user_id
        self.fingerprint = fingerprint
        self.metadata = metadata
        self.timestamp = timestamp

class TicketParser(MapFunction):
    
    def map(self, value: str) -> Tuple[str, TicketData]:
        try:
            data = json.loads(value)
            ticket = TicketData(
                image_url=data['imageUrl'],
                user_id=data['userId'],
                fingerprint=data['fingerprint'],
                metadata=data['metadata'],
                timestamp=data['timestamp']
            )
            return (ticket.fingerprint, ticket)
        except Exception as e:
            logger.error(f"Error parsing ticket data: {e}")
            return None

class FraudDetector(KeyedProcessFunction):
    """Detect fraudulent tickets based on various criteria"""
    
    def __init__(self):
        self.fingerprint_state = None
        self.user_activity_state = None
        self.suspicious_patterns_state = None
    
    def open(self, runtime_context: RuntimeContext):
        # State for tracking fingerprint occurrences
        self.fingerprint_state = runtime_context.get_value_state(
            ValueStateDescriptor("fingerprint_count", Types.INT())
        )
        
        # State for tracking user activity
        self.user_activity_state = runtime_context.get_value_state(
            ValueStateDescriptor("user_activity", Types.STRING())
        )
        
        # State for tracking suspicious patterns
        self.suspicious_patterns_state = runtime_context.get_value_state(
            ValueStateDescriptor("suspicious_patterns", Types.STRING())
        )
    
    def process_element(self, value: TicketData, ctx: 'KeyedProcessFunction.OnTimerContext'):
        fingerprint = value.fingerprint
        user_id = value.user_id
        
        # Get current fingerprint count
        current_count = self.fingerprint_state.value()
        if current_count is None:
            current_count = 0
        
        # Increment count
        current_count += 1
        self.fingerprint_state.update(current_count)
        
        # Get user activity
        user_activity = self.user_activity_state.value()
        if user_activity is None:
            user_activity = "[]"
        
        activity_list = json.loads(user_activity)
        activity_list.append({
            'timestamp': value.timestamp,
            'fingerprint': fingerprint,
            'metadata': value.metadata
        })
        
        # Keep only last 10 activities per user
        if len(activity_list) > 10:
            activity_list = activity_list[-10:]
        
        self.user_activity_state.update(json.dumps(activity_list))
        
        # Fraud detection logic
        fraud_score = 0
        fraud_reasons = []
        
        # 1. Duplicate fingerprint detection
        if current_count > 1:
            fraud_score += 50
            fraud_reasons.append(f"Duplicate fingerprint detected (count: {current_count})")
        
        # 2. Multiple uploads by same user in short time
        recent_uploads = [a for a in activity_list if 
                         (datetime.fromisoformat(value.timestamp.replace('Z', '+00:00')) - 
                          datetime.fromisoformat(a['timestamp'].replace('Z', '+00:00'))).seconds < 300]
        
        if len(recent_uploads) > 3:
            fraud_score += 30
            fraud_reasons.append(f"Multiple uploads in short time ({len(recent_uploads)} in 5 minutes)")
        
        # 3. Check for suspicious metadata patterns
        if self._check_suspicious_metadata(value.metadata):
            fraud_score += 20
            fraud_reasons.append("Suspicious metadata patterns detected")
        
        # 4. Check for rapid fingerprint changes (potential manipulation)
        if len(activity_list) >= 2:
            recent_fingerprints = [a['fingerprint'] for a in activity_list[-3:]]
            if len(set(recent_fingerprints)) == len(recent_fingerprints) and len(recent_fingerprints) > 1:
                # All fingerprints are different, which might indicate manipulation
                fraud_score += 15
                fraud_reasons.append("Rapid fingerprint changes detected")
        
        # Create fraud detection result
        fraud_result = {
            'ticket_id': fingerprint,
            'user_id': user_id,
            'image_url': value.image_url,
            'fraud_score': fraud_score,
            'fraud_reasons': fraud_reasons,
            'is_fraudulent': fraud_score >= 30,
            'timestamp': value.timestamp,
            'metadata': value.metadata
        }
        
        # Emit fraud detection result
        ctx.collect(json.dumps(fraud_result))
        
        # Set timer for cleanup (24 hours)
        ctx.timer_service().register_processing_time_timer(
            ctx.timer_service().current_processing_time() + 24 * 60 * 60 * 1000
        )
    
    def on_timer(self, timestamp: int, ctx: 'KeyedProcessFunction.OnTimerContext'):
        # Cleanup old data
        self.fingerprint_state.clear()
        self.user_activity_state.clear()
        self.suspicious_patterns_state.clear()
    
    def _check_suspicious_metadata(self, metadata: dict) -> bool:
        """Check for suspicious patterns in ticket metadata"""
        suspicious_indicators = [
            'test', 'sample', 'demo', 'fake', 'invalid', 'expired',
            'void', 'cancelled', 'refunded', 'duplicate'
        ]
        
        metadata_str = json.dumps(metadata).lower()
        return any(indicator in metadata_str for indicator in suspicious_indicators)

class FraudResultSerializer(MapFunction):
    """Serialize fraud detection results for Kafka output"""
    
    def map(self, fraud_result: str) -> str:
        return fraud_result

def create_fraud_detection_job():
    """Create and configure the Flink fraud detection job"""
    
    # Set up execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    
    # Set up Kafka consumer
    kafka_consumer = FlinkKafkaConsumer(
        topics='ticket_uploads',
        deserialization_schema=SimpleStringSchema(),
        properties={
            'bootstrap.servers': 'localhost:9092',
            'group.id': 'fraud-detection-group',
            'auto.offset.reset': 'latest'
        }
    )
    
    # Set up Kafka producer for fraud results
    kafka_producer = FlinkKafkaProducer(
        topic='fraud_results',
        serialization_schema=SimpleStringSchema(),
        producer_config={
            'bootstrap.servers': 'localhost:9092',
            'client.id': 'fraud-detection-producer'
        }
    )
    
    # Create the processing pipeline
    stream = env.add_source(kafka_consumer)
    
    # Parse incoming messages
    parsed_stream = stream.map(TicketParser())
    
    # Apply fraud detection
    fraud_stream = parsed_stream.key_by(lambda x: x[0]).process(FraudDetector())
    
    # Serialize and send results
    fraud_stream.map(FraudResultSerializer()).add_sink(kafka_producer)
    
    return env

def main():
    """Main function to run the fraud detection job"""
    try:
        logger.info("Starting Flink fraud detection job...")
        
        # Create and execute the job
        env = create_fraud_detection_job()
        
        # Execute the job
        job_name = "Ticket Fraud Detection"
        env.execute(job_name)
        
        logger.info("Flink fraud detection job completed successfully")
        
    except Exception as e:
        logger.error(f"Error in fraud detection job: {e}")
        raise

if __name__ == "__main__":
    main()
