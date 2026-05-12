from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class SystemConfigCreate(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1)
    description: Optional[str] = None

class SystemConfigUpdate(BaseModel):
    value: str = Field(..., min_length=1)
    description: Optional[str] = None

class SystemConfigOut(BaseModel):
    id: UUID
    key: str
    value: str
    description: Optional[str]
    updated_by: Optional[UUID]
    updated_at: datetime

    class Config:
        from_attributes = True
