from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from uuid import UUID

class PolicyCreate(BaseModel):
    policy_number: str = Field(..., min_length=1, max_length=100)
    insurer_id: UUID
    farmer_id: UUID
    crop: str = Field(..., min_length=1, max_length=100)
    insured_area: float = Field(..., gt=0)
    sum_insured: float = Field(..., gt=0)
    premium_paid: float = Field(..., gt=0)
    start_date: date
    end_date: date

class PolicyOut(BaseModel):
    id: UUID
    policy_number: str
    insurer_id: UUID
    farmer_id: UUID
    crop: str
    insured_area: float
    sum_insured: float
    premium_paid: float
    start_date: date
    end_date: date
    status: str

    class Config:
        from_attributes = True
