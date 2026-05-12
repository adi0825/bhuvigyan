import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.farmer import Farmer
from app.models.udlrn_master import UdlrnMaster
from app.models.admin import AdminOfficer
from app.models.field_officer import FieldOfficer
from app.models.csc_operator import CscOperator
from app.models.insurer import Insurer
from app.models.location import LocationState, LocationDistrict
from app.models.claim import Claim
from app.models.notification import Notification
from app.utils.password_utils import get_password_hash
from uuid import uuid4

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with async_session() as db:
        print("Seeding farmers...")
        farmer_names = [
            "Rajesh Kumar",
            "Suresh Patil",
            "Mohan Reddy",
            "Ravi Gowda",
            "Anil Sharma",
            "Sunita Devi",
            "Geeta Bai",
        ]
        for i in range(1, 8):
            mobile = f"990000000{i}"
            farmer = Farmer(mobile=mobile, full_name=farmer_names[i-1], is_verified=True, carbon_eligible=True,
                            state_code="KA", district="Bengaluru Rural", bank_name="State Bank of India",
                            bank_ifsc="SBIN0001234", bank_account=f"1234567890{i}")
            db.add(farmer)
            await db.flush()
            udlrn = UdlrnMaster(udlrn=f"KA01-2024-0000{i}", farmer_id=farmer.id, land_area_ha=2.5, declared_crop="PADDY", carbon_score=100)
            db.add(udlrn)
            notif = Notification(farmer_id=farmer.id, title="Welcome to Bhuvigyan", message=f"Namaste {farmer_names[i-1]}, your land has been verified under UDLRN KA01-2024-0000{i}.", is_read=False, channel="IN_APP")
            db.add(notif)

        print("Seeding admin...")
        admin = AdminOfficer(email="superadmin@bhuvigyan.gov.in", full_name="Super Admin", role="SUPER_ADMIN", password_hash=get_password_hash("Admin@123"))
        db.add(admin)

        print("Seeding field officer...")
        officer = FieldOfficer(email="inspector.ka@bhuvigyan.gov.in", full_name="Inspector Kumar", role="FIELD_OFFICER", employee_id="EMP-KA-0001", designation="Field Officer", password_hash=get_password_hash("Password@123"))
        db.add(officer)

        print("Seeding CSC...")
        csc = CscOperator(csc_id="CSC-KA-001", name="CSC Operator", mobile="9900000000", password_hash=get_password_hash("Csc@123"))
        db.add(csc)

        print("Seeding insurer...")
        insurer = Insurer(company_name="Agri Insurance Ltd", email="insurer@agri.gov.in", password_hash=get_password_hash("Insurer@123"))
        db.add(insurer)

        print("Seeding locations...")
        state = LocationState(name="Karnataka", code="KA")
        db.add(state)
        await db.flush()
        district = LocationDistrict(state_id=state.id, name="Bengaluru Rural", code="BR")
        db.add(district)

        print("Seeding claims...")
        claims_data = [
            {"status": "AUTO_APPROVED", "fraud_score": 20, "fraud_verdict": "AUTO_APPROVE"},
            {"status": "AUTO_APPROVED", "fraud_score": 25, "fraud_verdict": "AUTO_APPROVE"},
            {"status": "UNDER_REVIEW", "fraud_score": 45, "fraud_verdict": "OFFICER_REVIEW"},
            {"status": "UNDER_REVIEW", "fraud_score": 55, "fraud_verdict": "OFFICER_REVIEW"},
            {"status": "PENDING", "fraud_score": 70, "fraud_verdict": "MANDATORY_VISIT"},
            {"status": "PENDING", "fraud_score": 75, "fraud_verdict": "MANDATORY_VISIT"},
            {"status": "AUTO_REJECTED", "fraud_score": 90, "fraud_verdict": "AUTO_REJECT_FIR"},
            {"status": "AUTO_REJECTED", "fraud_score": 95, "fraud_verdict": "AUTO_REJECT_FIR"},
        ]
        for i, cdata in enumerate(claims_data):
            claim = Claim(claim_number=f"CLM-2024-000{i+1}", udlrn=f"KA01-2024-0000{(i%7)+1}", declared_crop="PADDY", claimed_area_ha=2.5, season="KHARIF", year=2024, **cdata)
            db.add(claim)

        await db.commit()
        print("Seed completed!")

if __name__ == "__main__":
    asyncio.run(seed())