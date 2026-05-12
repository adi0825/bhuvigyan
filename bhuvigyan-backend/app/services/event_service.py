"""
Bhuvigyan V7 — Event Producer Service
Pluggable Kafka producer with local in-memory fallback for dev.
"""
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import uuid4

# Attempt Kafka import; fallback to in-memory queue if unavailable
try:
    from aiokafka import AIOKafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

from app.config import settings

# In-memory fallback queue for local dev / testing
_event_queue: list = []


async def _get_producer():
    if not KAFKA_AVAILABLE:
        return None
    producer = AIOKafkaProducer(
        bootstrap_servers=getattr(settings, "KAFKA_BROKERS", "localhost:9092"),
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await producer.start()
    return producer


async def publish_event(
    topic: str,
    payload: Dict[str, Any],
    idempotency_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Publish event to Kafka or enqueue locally."""
    event = {
        "event_type": topic,
        "idempotency_key": idempotency_key or str(uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "payload": payload,
    }

    if KAFKA_AVAILABLE:
        try:
            producer = await _get_producer()
            if producer:
                await producer.send(topic, event)
                await producer.stop()
                return {"published": True, "channel": "kafka", "topic": topic}
        except Exception:
            pass

    # Fallback: in-memory queue
    _event_queue.append(event)
    return {"published": True, "channel": "memory_queue", "topic": topic, "queue_depth": len(_event_queue)}


async def get_queue_depth() -> int:
    return len(_event_queue)


def get_queued_events(limit: int = 100) -> list:
    return _event_queue[:limit]
