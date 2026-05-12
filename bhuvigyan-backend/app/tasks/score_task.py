"""
Bhuvigyan V7 — Async Fraud Scoring Tasks
"""
from uuid import UUID
from app.celery_app import celery_app
from app.database import sync_engine
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=sync_engine)


@celery_app.task(name="scoring.score_claim", bind=True, max_retries=3, default_retry_delay=30)
def score_claim_task(self, claim_id: str):
    """Async fraud scoring for a single claim."""
    from app.services.scoring_service import score_claim
    from sqlalchemy.ext.asyncio import AsyncSession
    import asyncio

    db = SessionLocal()
    try:
        # Note: score_claim is async, so we need to run it in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(score_claim(claim_id, db, use_cpp=True))
        loop.close()
        return {"success": True, "claim_id": claim_id, "result": result}
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(name="scoring.batch_score")
def batch_score_claims(claim_ids: list[str]):
    """Score multiple claims in batch."""
    results = []
    for cid in claim_ids:
        try:
            result = score_claim_task.delay(cid)
            results.append({"claim_id": cid, "task_id": result.id})
        except Exception as e:
            results.append({"claim_id": cid, "error": str(e)})
    return {"success": True, "total": len(claim_ids), "results": results}
