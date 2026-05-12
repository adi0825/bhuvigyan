from uuid import uuid4
from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment import Payment
from app.models.claim import Claim
from app.models.farmer import Farmer


async def create_payment(db: AsyncSession, claim_id: str, farmer_id: str, amount: float, bank_account_masked: str, bank_ifsc: str) -> Payment:
    payment = Payment(
        id=uuid4(),
        claim_id=claim_id,
        farmer_id=farmer_id,
        payment_reference=f"BHV-PAY-{datetime.utcnow().strftime('%Y%m%d')}-{str(uuid4())[:8].upper()}",
        amount=Decimal(str(amount)),
        bank_account_masked=bank_account_masked,
        bank_ifsc=bank_ifsc,
        status="queued",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


async def get_payments(db: AsyncSession, status: str = None, limit: int = 50, offset: int = 0):
    query = select(Payment).order_by(Payment.created_at.desc())
    if status:
        query = query.where(Payment.status == status)
    result = await db.execute(query.limit(limit).offset(offset))
    return result.scalars().all()


async def get_payment_by_id(db: AsyncSession, payment_id: str):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    return result.scalar_one_or_none()


async def update_payment_status(db: AsyncSession, payment_id: str, status: str, npci_txn_id: str = None, failure_reason: str = None):
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        return None
    payment.status = status
    if npci_txn_id:
        payment.npci_transaction_id = npci_txn_id
    if failure_reason:
        payment.failure_reason = failure_reason
    if status == "settled":
        payment.settled_at = datetime.utcnow()
    await db.commit()
    await db.refresh(payment)
    return payment


async def initiate_batch_payment(db: AsyncSession, claim_ids: list, admin_id: str):
    batch_id = f"BATCH-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    payments = []
    for claim_id in claim_ids:
        claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
        claim = claim_result.scalar_one_or_none()
        if not claim or claim.status != "APPROVED":
            continue
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
        farmer = farmer_result.scalar_one_or_none()
        if not farmer:
            continue
        payment = Payment(
            id=uuid4(),
            claim_id=claim.id,
            farmer_id=farmer.id,
            payment_reference=f"BHV-PAY-{str(uuid4())[:8].upper()}",
            amount=claim.approved_amount or Decimal("0"),
            bank_account_masked=("XXXXX" + farmer.bank_account[-4:]) if farmer.bank_account else None,
            bank_ifsc=farmer.bank_ifsc,
            status="queued",
            batch_id=batch_id,
        )
        db.add(payment)
        payments.append(payment)
    await db.commit()
    for p in payments:
        await db.refresh(p)
    return {"batch_id": batch_id, "payments": payments, "count": len(payments)}


async def get_payment_stats(db: AsyncSession):
    total = await db.execute(select(func.count()).select_from(Payment))
    queued = await db.execute(select(func.count()).select_from(Payment).where(Payment.status == "queued"))
    processing = await db.execute(select(func.count()).select_from(Payment).where(Payment.status == "processing"))
    settled = await db.execute(select(func.count()).select_from(Payment).where(Payment.status == "settled"))
    failed = await db.execute(select(func.count()).select_from(Payment).where(Payment.status == "failed"))
    total_settled = await db.execute(select(func.sum(Payment.amount)).where(Payment.status == "settled"))
    return {
        "total": total.scalar() or 0,
        "queued": queued.scalar() or 0,
        "processing": processing.scalar() or 0,
        "settled": settled.scalar() or 0,
        "failed": failed.scalar() or 0,
        "total_settled_inr": float(total_settled.scalar() or 0),
    }
