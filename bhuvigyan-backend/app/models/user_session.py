from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, INET
from uuid import uuid4
from datetime import datetime
from app.database import Base

class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    jti = Column(String(255), unique=True, nullable=False)
    token_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class TotpConfig(Base):
    __tablename__ = "totp_config"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    secret_encrypted = Column(Text, nullable=False)
    backup_codes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
