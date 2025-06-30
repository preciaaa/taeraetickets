#!/usr/bin/env python3
"""
Startup script for all ticket processing services
This script can start Kafka consumers and Flink job in separate processes
"""

import subprocess
import sys
import os
import time
import signal
import logging
from typing import List, Dict
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ServiceManager:
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.service_configs = {
            'ocr_consumer': {
                'script': 'kafka/consumer.py',
                'args': ['ocr'],
                'description': 'OCR Consumer'
            },
            'embedding_consumer': {
                'script': 'kafka/consumer.py',
                'args': ['embedding'],
                'description': 'Embedding Consumer'
            },
            'alert_consumer': {
                'script': 'kafka/consumer.py',
                'args': ['alert'],
                'description': 'Similarity Alert Consumer'
            },
            'flink_job': {
                'script': 'kafka/flink_similarity_checker.py',
                'args': [],
                'description': 'Flink Similarity Checker'
            }
        }
    
    def start_service(self, service_name: str) -> subprocess.Popen:
        """Start a single service"""
        if service_name not in self.service_configs:
            raise ValueError(f"Unknown service: {service_name}")
        
        config = self.service_configs[service_name]
        script_path = os.path.join(os.path.dirname(__file__), config['script'])
        
        logger.info(f"Starting {config['description']}...")
        
        # Start the process
        process = subprocess.Popen(
            [sys.executable, script_path] + config['args'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        self.processes.append(process)
        logger.info(f"Started {config['description']} with PID: {process.pid}")
        
        return process
    
    def start_all_services(self) -> Dict[str, subprocess.Popen]:
        """Start all services"""
        started_services = {}
        
        for service_name in self.service_configs.keys():
            try:
                process = self.start_service(service_name)
                started_services[service_name] = process
                time.sleep(2)  # Give each service time to start
            except Exception as e:
                logger.error(f"Failed to start {service_name}: {str(e)}")
        
        return started_services
    
    def start_selected_services(self, services: List[str]) -> Dict[str, subprocess.Popen]:
        """Start selected services"""
        started_services = {}
        
        for service_name in services:
            if service_name in self.service_configs:
                try:
                    process = self.start_service(service_name)
                    started_services[service_name] = process
                    time.sleep(2)
                except Exception as e:
                    logger.error(f"Failed to start {service_name}: {str(e)}")
            else:
                logger.warning(f"Unknown service: {service_name}")
        
        return started_services
    
    def stop_all_services(self):
        """Stop all running services"""
        logger.info("Stopping all services...")
        
        for process in self.processes:
            try:
                process.terminate()
                logger.info(f"Terminated process {process.pid}")
            except Exception as e:
                logger.error(f"Error terminating process {process.pid}: {str(e)}")
        
        # Wait for processes to terminate
        for process in self.processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                logger.warning(f"Force killing process {process.pid}")
                process.kill()
        
        self.processes.clear()
        logger.info("All services stopped")
    
    def monitor_services(self, timeout: int = None):
        """Monitor running services"""
        logger.info("Monitoring services... Press Ctrl+C to stop")
        
        try:
            start_time = time.time()
            while True:
                # Check if any processes have died
                for i, process in enumerate(self.processes):
                    if process.poll() is not None:
                        logger.warning(f"Process {process.pid} has died")
                        # Remove dead process
                        self.processes.pop(i)
                        break
                
                # Check timeout
                if timeout and (time.time() - start_time) > timeout:
                    logger.info(f"Timeout reached ({timeout}s), stopping services")
                    break
                
                time.sleep(5)
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        finally:
            self.stop_all_services()

def main():
    parser = argparse.ArgumentParser(description='Start ticket processing services')
    parser.add_argument('--services', nargs='+', 
                       choices=['ocr_consumer', 'embedding_consumer', 'alert_consumer', 'flink_job'],
                       help='Services to start (default: all)')
    parser.add_argument('--timeout', type=int, 
                       help='Timeout in seconds (default: run indefinitely)')
    parser.add_argument('--list', action='store_true',
                       help='List available services')
    
    args = parser.parse_args()
    
    manager = ServiceManager()
    
    if args.list:
        print("Available services:")
        for name, config in manager.service_configs.items():
            print(f"  {name}: {config['description']}")
        return
    
    try:
        if args.services:
            logger.info(f"Starting selected services: {args.services}")
            started_services = manager.start_selected_services(args.services)
        else:
            logger.info("Starting all services")
            started_services = manager.start_all_services()
        
        if started_services:
            logger.info(f"Started {len(started_services)} services")
            manager.monitor_services(args.timeout)
        else:
            logger.error("No services were started successfully")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        manager.stop_all_services()
        sys.exit(1)

if __name__ == "__main__":
    main() 