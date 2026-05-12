from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime
from app.database import Base

class FarmerAddress(Base):
    __tablename__ = "farmer_addresses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(UUID(as_uuid=True), nullable=False)
    address_type = Column(String(20), nullable=False)
    address_line = Column(String(500), nullable=True)
    pincode = Column(String(10), nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
