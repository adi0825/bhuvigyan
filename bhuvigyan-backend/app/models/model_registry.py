from sqlalchemy import Column, String, Numeric, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class ModelRegistry(Base):
    __tablename__ = "model_registry"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    version = Column(String(50), unique=True, nullable=False)
    algorithm = Column(String(100), nullable=False)
    feature_count = Column(String(10), nullable=False)
    training_date = Column(Date, nullable=False)
    validation_auc = Column(Numeric(5, 4), nullable=True)
    test_auc = Column(Numeric(5, 4), nullable=True)
    status = Column(String(20), default="STAGING")
    storage_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ModelDeployment(Base):
    __tablename__ = "model_deployments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    model_id = Column(UUID(as_uuid=True), nullable=False)
    deployed_at = Column(DateTime, default=datetime.utcnow)
    deployed_by = Column(UUID(as_uuid=True), nullable=True)
    previous_model_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(String(500), nullable=True)
