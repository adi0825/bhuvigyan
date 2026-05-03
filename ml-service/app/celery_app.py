"""
Celery worker + Kafka bridge.

Two responsibilities:
  1. Consume `satellite.job.requested` events from Kafka.
  2. For each event, run SatelliteAnalysisService.analyze() as a Celery task
     and publish the result back to Kafka topic `satellite.job.completed`.
"""
from __future__ import annotations

import json
import logging
import signal
import threading
from typing import Any

from celery import Celery
from kafka import KafkaConsumer, KafkaProducer

from .service import SatelliteAnalysisService
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

celery_app = Celery(
    "bhuvigyan_ml",
    broker=settings.computed_redis_url,
    backend=settings.computed_redis_url,
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
)

_service: SatelliteAnalysisService | None = None


def _get_service() -> SatelliteAnalysisService:
    global _service
    if _service is None:
        _service = SatelliteAnalysisService()
    return _service


# ----------------------------------------------------------------------
@celery_app.task(name="bhuvigyan.satellite.analyze", bind=True, max_retries=3)
def analyze_job(self, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _get_service().analyze(payload)
    except Exception as exc:
        logger.exception("Celery analyze failed; retrying in 30s: %s", exc)
        raise self.retry(exc=exc, countdown=30)


# ----------------------------------------------------------------------
# Kafka bridge (runs in the same worker container via on_worker_ready)
# ----------------------------------------------------------------------
TOPIC_REQUEST   = "satellite.job.requested"
TOPIC_COMPLETED = "satellite.job.completed"


class KafkaBridge(threading.Thread):
    daemon = True

    def __init__(self) -> None:
        super().__init__(name="kafka-bridge")
        self._stop = threading.Event()
        self._consumer: KafkaConsumer | None = None
        self._producer: KafkaProducer | None = None

    def run(self) -> None:
        try:
            self._consumer = KafkaConsumer(
                TOPIC_REQUEST,
                bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
                group_id="ml-service-workers",
                value_deserializer=lambda v: json.loads(v.decode()),
                enable_auto_commit=True,
                auto_offset_reset="earliest",
            )
            self._producer = KafkaProducer(
                bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
                value_serializer=lambda v: json.dumps(v).encode(),
            )
            logger.info("Kafka bridge started (topics: %s -> %s)", TOPIC_REQUEST, TOPIC_COMPLETED)
        except Exception as exc:
            logger.error("Kafka bridge failed to start: %s", exc)
            return

        for message in self._consumer:
            if self._stop.is_set():
                break
            try:
                event = message.value
                claim_id = event.get("claimId")
                req_payload = {
                    "udlrn":                  event.get("udlrn"),
                    "polygon_geojson":        event.get("polygonGeoJson"),
                    "sowing_date":            event.get("sowingDate"),
                    "claim_date":             event.get("claimDate"),
                    "state":                  event.get("stateCode") or "00",
                    "declared_crop":          event.get("declaredCrop"),
                    "claim_id":               claim_id,
                }
                logger.info("Dispatching analyze for claim %s", claim_id)
                result = _get_service().analyze(req_payload)
                self._producer.send(TOPIC_COMPLETED, {
                    "claimId": claim_id,
                    "udlrn":   event.get("udlrn"),
                    "result":  result,
                })
                self._producer.flush()
            except Exception as exc:
                logger.exception("Kafka bridge event failed: %s", exc)

    def stop(self) -> None:
        self._stop.set()
        if self._consumer:
            try: self._consumer.close()
            except Exception: pass


_bridge: KafkaBridge | None = None


def _start_bridge(**_: Any) -> None:
    global _bridge
    if _bridge is None:
        _bridge = KafkaBridge()
        _bridge.start()


def _stop_bridge(**_: Any) -> None:
    if _bridge is not None:
        _bridge.stop()


# Celery lifecycle hooks ------------------------------------------------
from celery.signals import worker_ready, worker_shutdown  # noqa: E402

worker_ready.connect(_start_bridge)
worker_shutdown.connect(_stop_bridge)


def _handle_signal(signum, frame):  # pragma: no cover
    _stop_bridge()


signal.signal(signal.SIGTERM, _handle_signal)
