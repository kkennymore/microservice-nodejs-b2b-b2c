"""
Event Publisher - RabbitMQ event publishing for recommender service
===================================================================

Handles asynchronous event publishing for system integration.
"""

import logging
import json
from typing import Dict, Any
from datetime import datetime
import aio_pika

logger = logging.getLogger(__name__)


class EventPublisher:
    """RabbitMQ event publisher"""

    def __init__(self, channel: aio_pika.Channel):
        self.channel = channel
        self.exchange_name = "marketplace.events"

    async def publish_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Publish an event to RabbitMQ"""
        try:
            # Declare exchange
            exchange = await self.channel.declare_exchange(
                self.exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )

            # Create message
            message_data = {
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
                "source": "recommender-service"
            }

            message = aio_pika.Message(
                body=json.dumps(message_data).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                headers={"content-type": "application/json"}
            )

            # Publish message
            await exchange.publish(message, routing_key=event_type)

            logger.info(f"Published event: {event_type}")
            return True

        except Exception as e:
            logger.error(f"Failed to publish event {event_type}: {e}")
            return False

    async def publish_system_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Publish system-level events"""
        return await self.publish_event(f"system.{event_type}", data)

    async def publish_recommendation_event(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Publish recommendation-specific events"""
        return await self.publish_event(f"recommendation.{event_type}", data)

    async def close(self) -> None:
        """Close the event publisher"""
        if self.channel:
            await self.channel.close()
            logger.info("Event publisher closed")