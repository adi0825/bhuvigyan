"""
Bhuvigyan V7 — Async PDF Dossier Generation Tasks
"""
from app.celery_app import celery_app
from app.database import sync_engine
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=sync_engine)


@celery_app.task(name="pdf.generate_dossier", bind=True, max_retries=2, default_retry_delay=60)
def generate_dossier_pdf_task(self, claim_id: str):
    """Generate evidence dossier PDF asynchronously."""
    from app.services.dossier_service import generate_evidence_dossier
    from app.services.pdf_service import generate_pdf_from_dossier
    import asyncio

    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        dossier = loop.run_until_complete(generate_evidence_dossier(claim_id, db))
        pdf_path = loop.run_until_complete(generate_pdf_from_dossier(dossier))
        loop.close()
        return {"success": True, "claim_id": claim_id, "pdf_path": pdf_path}
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        db.close()
