import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from app.database import Base
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.models.claim import Claim
from app.models.admin import AdminOfficer
from app.models.csc_operator import CscOperator
from app.models.field_officer import FieldOfficer
from app.models.cce_visit import CceVisit
from app.models.notification import Notification
from app.models.insurer import Insurer
from app.models.audit_trail import AuditTrail
from app.models.location import LocationState, LocationDistrict, LocationTaluk, LocationHobli, LocationVillage

async def create_tables():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("All tables created!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())