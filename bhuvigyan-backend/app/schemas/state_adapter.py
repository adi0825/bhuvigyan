from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID

class StateAdapterCreate(BaseModel):
    state_code: str = Field(..., min_length=2, max_length=2)
    name: str = Field(..., min_length=1, max_length=100)
    config_json: Dict[str, Any]
    active: bool = True

class StateAdapterUpdate(BaseModel):
    name: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None
    active: Optional[bool] = None

class StateAdapterOut(BaseModel):
    id: UUID
    state_code: str
    name: str
    config_json: Dict[str, Any]
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
