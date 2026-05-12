from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class FraudFactor(BaseModel):
    name: str
    weight: float
    direction: str
    description: str

class FraudScoreOut(BaseModel):
    model_config = {"protected_namespaces": (), "from_attributes": True}

    id: UUID
    claim_id: UUID
    score: float
    confidence: float
    risk_level: str
    model_version: str
    computed_at: datetime

class FraudExplanationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    fraud_score_id: UUID
    top_factors: List[FraudFactor]
    shap_values: Optional[Dict[str, Any]] = None
    human_readable_text: Optional[str] = None

class FraudScoreCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    claim_id: UUID
    score: float
    confidence: float
    risk_level: str
    model_version: str

class ScoreOverrideRequest(BaseModel):
    override_score: float
    override_reason: str = Field(..., min_length=20)
