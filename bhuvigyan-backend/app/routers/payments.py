"""Payment & Disbursement endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("")
async def list_payments(status: str = None, db: AsyncSession = Depends(get_db)):
    payments = await payment_service.get_payments(db, status)
    return {"success": True, "data": payments}


@router.get("/stats")
async def payment_stats(db: AsyncSession = Depends(get_db)):
    stats = await payment_service.get_payment_stats(db)
    return {"success": True, "data": stats}


@router.post("/batch")
async def initiate_batch(body: dict, db: AsyncSession = Depends(get_db)):
    result = await payment_service.initiate_batch_payment(
        db, body.get("claim_ids", []), body.get("admin_id", "admin")
    )
    return {"success": True, "data": result}


@router.put("/{payment_id}/status")
async def update_status(payment_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    payment = await payment_service.update_payment_status(
        db, payment_id, body.get("status"), body.get("npci_transaction_id"), body.get("failure_reason")
    )
    if not payment:
        raise HTTPException(404, "Payment not found")
    return {"success": True, "data": payment}
