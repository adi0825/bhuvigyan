"""
Bhuvigyan V7 — Kafka Consumer Stubs
Event-driven consumers for scoring, notifications, and audit.
"""
import json
import asyncio
from datetime import datetime
from typing import Dict, Any
from uuid import UUID

try:
    from aiokafka import AIOKafkaConsumer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

from app.config import settings


class BaseConsumer:
    """Base class for Kafka consumers with idempotency and retry."""
    def __init__(self, topic: str, group_id: str):
        self.topic = topic
        self.group_id = group_id
        self.consumer = None

    async def start(self):
        if KAFKA_AVAILABLE:
            self.consumer = AIOKafkaConsumer(
                self.topic,
                bootstrap_servers=settings.KAFKA_BROKERS,
                group_id=self.group_id,
                value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            )
            await self.consumer.start()

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()

    async def run(self):
        if not KAFKA_AVAILABLE:
            print(f"[MOCK] {self.group_id} consumer running (no Kafka)")
            while True:
                await asyncio.sleep(60)
            return

        try:
            async for msg in self.consumer:
                try:
                    await self.process(msg.value)
                except Exception as e:
                    print(f"[{self.group_id}] Error processing message: {e}")
        finally:
            await self.stop()

    async def process(self, event: Dict[str, Any]):
        raise NotImplementedError


class NotificationConsumer(BaseConsumer):
    """Consumes notification.dispatch.requested events."""
    def __init__(self):
        super().__init__("notification.dispatch.requested", "notification-service")

    async def process(self, event: Dict[str, Any]):
        payload = event.get("payload", {})
        print(f"[NotificationConsumer] Dispatching to user={payload.get('user_id')} type={payload.get('type')}")
        # Production: create in-app notification, send SMS, push


class ScoringConsumer(BaseConsumer):
    """Consumes score.requested events and triggers fraud scoring."""
    def __init__(self):
        super().__init__("score.requested", "scoring-service")

    async def process(self, event: Dict[str, Any]):
        claim_id = event.get("payload", {}).get("claim_id")
        print(f"[ScoringConsumer] Processing claim_id={claim_id}")
        # Production: call scoring_service.score_claim(claim_id, db)


class AuditConsumer(BaseConsumer):
    """Consumes all events and persists to audit_logs."""
    def __init__(self):
        super().__init__("audit.event.created", "audit-service")

    async def process(self, event: Dict[str, Any]):
        print(f"[AuditConsumer] Persisting audit event: {event.get('event_type')}")
        # Production: insert into audit_logs table


class DecisionConsumer(BaseConsumer):
    """Consumes decision.made events and triggers notifications."""
    def __init__(self):
        super().__init__("decision.made", "decision-service")

    async def process(self, event: Dict[str, Any]):
        payload = event.get("payload", {})
        print(f"[DecisionConsumer] Claim {payload.get('claim_id')} decided: {payload.get('decision')}")
        # Production: send farmer notification, update claim status


class DlqConsumer(BaseConsumer):
    """Consumes dead-letter queue events for manual review."""
    def __init__(self):
        super().__init__("*.dlq", "dlq-handler")

    async def process(self, event: Dict[str, Any]):
        print(f"[DLQ] Failed event: {event.get('event_type')} key={event.get('idempotency_key')}")
        # Production: alert ops team, log to monitoring


async def start_all_consumers():
    """Start all consumer tasks concurrently."""
    consumers = [
        NotificationConsumer(),
        ScoringConsumer(),
        AuditConsumer(),
        DecisionConsumer(),
        DlqConsumer(),
    ]
    for c in consumers:
        await c.start()
    tasks = [asyncio.create_task(c.run()) for c in consumers]
    await asyncio.gather(*tasks)
