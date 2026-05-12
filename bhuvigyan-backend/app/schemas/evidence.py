from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class EvidenceItemCreate(BaseModel):
    entity_type: str = Field(..., min_length=1, max_length=50)
    entity_id: UUID
    evidence_type: str = Field(..., min_length=1, max_length=50)
    file_hash: str = Field(..., min_length=1, max_length=255)
    storage_url: str = Field(..., min_length=1, max_length=500)
    meta_data: Optional[Dict[str, Any]] = None

class EvidenceItemOut(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    evidence_type: str
    file_hash: str
    storage_url: str
    meta_data: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
