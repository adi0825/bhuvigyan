from sqlalchemy import Column, String, Numeric, DateTime, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4
from datetime import datetime
from app.database import Base

class FraudScore(Base):
    __tablename__ = "fraud_scores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    confidence = Column(Numeric(3, 2), nullable=False)
    risk_level = Column(String(20), nullable=False)
    model_version = Column(String(50), nullable=False)
    feature_snapshot_id = Column(UUID(as_uuid=True), nullable=True)
    computed_at = Column(DateTime, default=datetime.utcnow)

class FraudExplanation(Base):
    __tablename__ = "fraud_explanations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    fraud_score_id = Column(UUID(as_uuid=True), nullable=False)
    top_factors = Column(JSONB, nullable=False)
    shap_values = Column(JSONB, nullable=True)
    human_readable_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FraudFeatureSnapshot(Base):
    __tablename__ = "fraud_feature_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), nullable=False)
    features_json = Column(JSONB, nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)

class RuleEvaluation(Base):
    __tablename__ = "rule_evaluations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    claim_id = Column(UUID(as_uuid=True), nullable=False)
    rule_name = Column(String(100), nullable=False)
    triggered = Column(Boolean, default=False)
    details = Column(JSONB, nullable=True)
    evaluated_at = Column(DateTime, default=datetime.utcnow)
