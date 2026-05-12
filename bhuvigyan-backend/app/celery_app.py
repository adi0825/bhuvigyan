"""
Bhuvigyan V7 — Celery Application
Redis-backed task queue for async operations.
"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "bhuvigyan",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.score_task", "app.tasks.pdf_task", "app.tasks.email_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_track_started=True,
    result_expires=3600,
    task_default_queue="bhuvigyan_default",
    task_routes={
        "app.tasks.score_task.*": {"queue": "scoring"},
        "app.tasks.pdf_task.*": {"queue": "pdf"},
        "app.tasks.email_task.*": {"queue": "notifications"},
    },
)
