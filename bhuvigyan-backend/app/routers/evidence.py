from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.evidence import EvidenceItem
from app.schemas.evidence import EvidenceItemCreate, EvidenceItemOut
from typing import List
from uuid import UUID as PyUUID

router = APIRouter()

@router.post("/evidence", response_model=EvidenceItemOut)
async def create_evidence(data: EvidenceItemCreate, db: AsyncSession = Depends(get_db)):
    item = EvidenceItem(**data.dict())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

@router.get("/evidence/{entity_type}/{entity_id}", response_model=List[EvidenceItemOut])
async def list_evidence(entity_type: str, entity_id: PyUUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EvidenceItem)
        .where(EvidenceItem.entity_type == entity_type, EvidenceItem.entity_id == entity_id)
        .order_by(EvidenceItem.created_at.desc())
    )
    return result.scalars().all()
