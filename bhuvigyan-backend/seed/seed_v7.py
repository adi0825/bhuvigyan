"""
Bhuvigyan V7 — Seed Data Runner
Populates the database with demo users, farmers, policies, claims, and state adapters.
Run: python seed/seed_v7.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from uuid import uuid4
from datetime import datetime, date, timedelta
from sqlalchemy import select
from app.database import sync_engine, Base
from app.models import (
    Farmer, Policy, Claim, ClaimStatusHistory, ClaimDocument,
    StateAdapter, ModelRegistry, SystemConfig, User,
    Role, Permission, RolePermission, DistrictMaster, CropMaster,
)
from app.config import settings
from sqlalchemy.orm import Session


def seed():
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=sync_engine)
    db = SessionLocal()

    try:
        print("Seeding Bhuvigyan V7 demo data...")

        # 1. Roles
        roles = {
            "FARMER": Role(id=uuid4(), name="FARMER", description="Rural policyholder"),
            "FIELD_OFFICER": Role(id=uuid4(), name="FIELD_OFFICER", description="Field inspector"),
            "REVIEWER": Role(id=uuid4(), name="REVIEWER", description="District claims reviewer"),
            "SUPER_ADMIN": Role(id=uuid4(), name="SUPER_ADMIN", description="Platform administrator"),
            "FRAUD_ANALYST": Role(id=uuid4(), name="FRAUD_ANALYST", description="Fraud investigation specialist"),
            "INSURER_ANALYST": Role(id=uuid4(), name="INSURER_ANALYST", description="Insurance portfolio analyst"),
            "CSC_OPERATOR": Role(id=uuid4(), name="CSC_OPERATOR", description="Common Service Centre operator"),
        }
        for r in roles.values():
            db.merge(r)
        db.commit()
        print("  Roles: OK")

        # 2. Users (admin)
        admin = User(
            id=uuid4(),
            email="superadmin@bhuvigyan.gov.in",
            role="SUPER_ADMIN",
            is_active=True,
        )
        db.merge(admin)
        db.commit()
        print("  Users: OK")

        # 3. Farmers (6 states)
        state_codes = ["MH", "KA", "TG", "PB", "UP", "RJ"]
        farmer_ids = []
        for i, sc in enumerate(state_codes, 1):
            fid = uuid4()
            farmer_ids.append(fid)
            f = Farmer(
                id=fid,
                full_name=f"Demo Farmer {i}",
                mobile=f"990000000{i}",
                state_code=sc,
                land_area=5.0 + i,
                land_unit="hectare",
                is_demo=True,
                carbon_eligible=True,
                carbon_enrolled=False,
                is_active=True,
            )
            db.merge(f)
        db.commit()
        print(f"  Farmers: {len(farmer_ids)} OK")

        # 4. Insurer
        from app.models.insurer import Insurer
        insurer = Insurer(id=uuid4(), name="PMFBY National Insurer", code="PMFBY-001", is_active=True)
        db.merge(insurer)
        db.commit()
        print("  Insurer: OK")

        # 5. Policies
        policy_ids = []
        crops = ["Rice", "Wheat", "Cotton", "Sugarcane", "Maize", "Rice"]
        for i, fid in enumerate(farmer_ids):
            pid = uuid4()
            policy_ids.append(pid)
            p = Policy(
                id=pid,
                policy_number=f"POL-2026-{1000+i}",
                insurer_id=insurer.id,
                farmer_id=fid,
                crop=crops[i],
                insured_area=5.0 + i,
                sum_insured=250000 + (i * 50000),
                premium_paid=5000 + (i * 1000),
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                status="ACTIVE",
            )
            db.merge(p)
        db.commit()
        print(f"  Policies: {len(policy_ids)} OK")

        # 6. Claims across all fraud bands
        claim_statuses = [
            ("DRAFT", 0), ("SUBMITTED", 15), ("SUBMITTED", 25),
            ("OFFICER_REVIEW", 45), ("OFFICER_REVIEW", 55),
            ("CCE_VISIT", 65), ("CCE_VISIT", 75),
            ("AUTO_REJECTED", 85), ("AUTO_REJECTED", 95),
            ("AUTO_APPROVED", 10), ("AUTO_APPROVED", 20),
        ]
        for i, (status, fscore) in enumerate(claim_statuses):
            fid = farmer_ids[i % len(farmer_ids)]
            pid = policy_ids[i % len(policy_ids)]
            cid = uuid4()
            c = Claim(
                id=cid,
                claim_number=f"C-2026-{10000+i}",
                udlrn=f"UDLRN-{i+1:05d}",
                farmer_id=fid,
                policy_id=pid,
                loss_type=["DROUGHT", "FLOOD", "HAIL", "PEST", "FIRE", "OTHER"][i % 6],
                loss_date=date(2026, 3, 15),
                affected_area=2.0 + (i % 5),
                claim_amount_requested=30000 + (i * 10000),
                description=f"Claim {i+1} description with sufficient detail for validation.",
                gps_latitude=12.97 + (i * 0.01),
                gps_longitude=77.59 + (i * 0.01),
                status=status,
                fraud_score=fscore,
                declared_crop=crops[i % len(crops)],
                claimed_area_ha=2.0 + (i % 5),
                damage_percent=30 + (i * 7),
                damage_cause=["DROUGHT", "FLOOD", "HAIL", "PEST", "FIRE", "OTHER"][i % 6],
                season="KHARIF",
                year=2026,
                filed_at=datetime.utcnow() - timedelta(days=i),
            )
            db.merge(c)
        db.commit()
        print(f"  Claims: {len(claim_statuses)} OK")

        # 7. State Adapters
        adapters = [
            ("MH", "Maharashtra Default", {"min_photos": 3, "ndvi_threshold": 0.35, "area_tolerance_pct": 12, "required_fields": ["revenue_survey_number"], "language": "mr"}),
            ("KA", "Karnataka Default", {"min_photos": 1, "ndvi_threshold": 0.20, "area_tolerance_pct": 10, "required_fields": ["rtc_number"], "language": "kn"}),
            ("TG", "Telangana Default", {"min_photos": 1, "ndvi_threshold": 0.30, "area_tolerance_pct": 10, "required_fields": ["aadhar_linkage_status"], "language": "te"}),
            ("PB", "Punjab Default", {"min_photos": 1, "ndvi_threshold": 0.35, "area_tolerance_pct": 10, "required_fields": ["crop_season"], "language": "pa"}),
            ("UP", "Uttar Pradesh Default", {"min_photos": 1, "ndvi_threshold": 0.28, "area_tolerance_pct": 10, "required_fields": ["khatauni"], "language": "hi"}),
            ("RJ", "Rajasthan Default", {"min_photos": 1, "ndvi_threshold": 0.25, "area_tolerance_pct": 10, "required_fields": ["imd_drought_notification_number"], "language": "hi"}),
        ]
        for sc, name, config in adapters:
            sa = StateAdapter(id=uuid4(), state_code=sc, name=name, config_json=config, active=True)
            db.merge(sa)
        db.commit()
        print(f"  State Adapters: {len(adapters)} OK")

        # 8. Model Registry
        mr = ModelRegistry(
            id=uuid4(),
            version="v6.0-ensemble",
            algorithm="XGBoost+LightGBM Ensemble",
            feature_count="47",
            training_date=date(2026, 4, 1),
            validation_auc=0.87,
            test_auc=0.85,
            status="PRODUCTION",
            storage_path="s3://bhuvigyan-models/v6.0-ensemble/model.pkl",
        )
        db.merge(mr)
        mr2 = ModelRegistry(
            id=uuid4(),
            version="v6.1-ensemble-beta",
            algorithm="XGBoost+LightGBM Ensemble",
            feature_count="47",
            training_date=date(2026, 5, 1),
            validation_auc=0.89,
            test_auc=0.87,
            status="STAGING",
            storage_path="s3://bhuvigyan-models/v6.1-ensemble-beta/model.pkl",
        )
        db.merge(mr2)
        db.commit()
        print("  Model Registry: OK")

        # 9. System Configs
        configs = [
            ("autoApproveBelow", "30", "Auto-approve claims with fraud score below this threshold"),
            ("manualReviewBelow", "60", "Manual review for scores below this threshold"),
            ("fieldVisitBelow", "80", "Mandatory field visit for scores below this threshold"),
        ]
        for key, value, desc in configs:
            sc = SystemConfig(id=uuid4(), key=key, value=value, description=desc)
            db.merge(sc)
        db.commit()
        print("  System Configs: OK")

        # 10. District and Crop Masters
        for sc in state_codes:
            dm = DistrictMaster(id=uuid4(), state_code=sc, district_code=f"{sc}-01", name=f"{sc} District 1")
            db.merge(dm)
        crops_master = ["Rice", "Wheat", "Cotton", "Sugarcane", "Maize"]
        for cname in crops_master:
            cm = CropMaster(id=uuid4(), name=cname, category="Agriculture", growing_season="Kharif/Rabi")
            db.merge(cm)
        db.commit()
        print("  District/Crop Masters: OK")

        print("\nSeed complete. Database populated with V7 demo data.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
