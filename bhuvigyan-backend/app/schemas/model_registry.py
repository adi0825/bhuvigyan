from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from uuid import UUID

class ModelRegistryCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)
    algorithm: str = Field(..., min_length=1, max_length=100)
    feature_count: str = Field(..., min_length=1, max_length=10)
    training_date: date
    validation_auc: Optional[float] = None
    test_auc: Optional[float] = None
    storage_path: str = Field(..., min_length=1, max_length=500)

class ModelRegistryOut(BaseModel):
    id: UUID
    version: str
    algorithm: str
    feature_count: str
    training_date: date
    validation_auc: Optional[float]
    test_auc: Optional[float]
    status: str
    storage_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class ModelPromoteRequest(BaseModel):
    notes: Optional[str] = None
