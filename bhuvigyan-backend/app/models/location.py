from sqlalchemy import Column, String, UUID as SQLUUID
from app.database import Base
from uuid import uuid4

class LocationState(Base):
    __tablename__ = "location_states"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100))
    code = Column(String(10))

class LocationDistrict(Base):
    __tablename__ = "location_districts"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    state_id = Column(SQLUUID(as_uuid=True))
    name = Column(String(100))
    code = Column(String(10))

class LocationTaluk(Base):
    __tablename__ = "location_taluks"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    district_id = Column(SQLUUID(as_uuid=True))
    name = Column(String(100))
    code = Column(String(10))

class LocationHobli(Base):
    __tablename__ = "location_hoblis"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    taluk_id = Column(SQLUUID(as_uuid=True))
    name = Column(String(100))
    code = Column(String(10))

class LocationVillage(Base):
    __tablename__ = "location_villages"
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid4)
    hobli_id = Column(SQLUUID(as_uuid=True))
    name = Column(String(100))
    code = Column(String(10))