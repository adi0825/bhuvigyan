from sqlalchemy import Column, String, Text, Boolean, DateTime, UUID as SQLUUID, ForeignKey
from app.database import Base
from datetime import datetime
from uuid import uuid4

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    farmer_id = Column(SQLUUID(as_uuid=True), ForeignKey("farmers.id"))
    title = Column(String(255))
    message = Column(Text)
    channel = Column(String(50), default="IN_APP")
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)