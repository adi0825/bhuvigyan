"""
Bhuvigyan V7 — Claim Decision Service
Applies auto-approve and auto-reject gate checks after fraud scoring.
"""
import logging
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.models.claim import Claim
from app.models.claim_document import ClaimDocument
from app.models.farmer import Farmer
from app.models.policy import Policy
from app.models.udlrn_master import UdlrnMaster
from app.services.land_service import LandVerifier

logger = logging.getLogger(__name__)
land_verifier = LandVerifier()


def extract_gps_from_exif(image_bytes: bytes) -> tuple:
    """Extract (lat, lng) from image EXIF GPSInfo. Returns (None, None) if missing."""
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
        import io

        img = Image.open(io.BytesIO(image_bytes))
        exif = img._getexif()
        if not exif:
            return (None, None)

        gps_info = None
        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == "GPSInfo":
                gps_info = value
                break

        if not gps_info:
            return (None, None)

        def _dms_to_dd(dms, ref):
            dd = float(dms[0]) + float(dms[1]) / 60.0 + float(dms[2]) / 3600.0
            if ref in ["S", "W"]:
                dd = -dd
            return dd

        lat = _dms_to_dd(gps_info.get(2), gps_info.get(1))
        lng = _dms_to_dd(gps_info.get(4), gps_info.get(3))
        return (lat, lng)
    except Exception:
        return (None, None)


async def validate_photo_gps(
    claim_id: str,
    farm_lat: float,
    farm_lng: float,
    max_distance_km: float = 2.0,
    db: AsyncSession = None,
) -> Dict[str, Any]:
    """Validate all claim photos have GPS EXIF within max_distance_km of farm centroid."""
    from app.services.land_service import LandVerifier
    lv = LandVerifier()

    docs_result = await db.execute(
        select(ClaimDocument).where(ClaimDocument.claim_id == UUID(claim_id))
    )
    docs = docs_result.scalars().all()

    total = len(docs)
    valid_gps = 0
    within_range = 0
    failures = []

    for doc in docs:
        # NOTE: In production, read actual file from storage path
        # For now, we check if the doc metadata has GPS fields
        meta = doc.meta_data or {}
        photo_lat = meta.get("gps_latitude")
        photo_lng = meta.get("gps_longitude")

        if photo_lat is None or photo_lng is None:
            failures.append({"doc_id": str(doc.id), "reason": "No GPS EXIF data"})
            continue

        valid_gps += 1
        dist = lv.distance_km(farm_lat, farm_lng, float(photo_lat), float(photo_lng))
        if dist <= max_distance_km:
            within_range += 1
        else:
            failures.append({
                "doc_id": str(doc.id),
                "reason": f"Photo GPS {dist:.2f}km from farm (max {max_distance_km}km)",
            })

    return {
        "total_photos": total,
        "with_gps": valid_gps,
        "within_range": within_range,
        "all_valid": len(failures) == 0 and total > 0,
        "failures": failures,
    }


async def check_auto_approval_gates(
    claim_id: str,
    fraud_score: float,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Verify ALL gate conditions before allowing AUTO_APPROVED status.
    If any gate fails, downgrade to OFFICER_REVIEW regardless of fraud score.
    """
    from uuid import UUID
    cid = UUID(claim_id)

    # Load claim + farmer + policy
    claim_result = await db.execute(select(Claim).where(Claim.id == cid))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        return {"eligible": False, "reason": "Claim not found", "gates": {}}

    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer = farmer_result.scalar_one_or_none()

    gates = {}

    # Gate 1: Fraud score in auto-approve band
    gates["fraud_score_low"] = fraud_score <= 30

    # Gate 2: All required documents present
    docs_result = await db.execute(
        select(func.count(ClaimDocument.id)).where(ClaimDocument.claim_id == cid)
    )
    doc_count = docs_result.scalar() or 0
    gates["documents_complete"] = doc_count >= 5  # min 5 geo-tagged photos

    # Gate 3: Bank verified (has bank_account and bank_ifsc)
    gates["bank_verified"] = bool(
        farmer and farmer.bank_account and farmer.bank_ifsc
    )

    # Gate 4: KGIS coordinates verified (farmer has lat/lng + is_verified)
    gates["coordinates_verified"] = bool(
        farmer and farmer.latitude and farmer.longitude and farmer.is_verified
    )

    # Gate 5: No duplicate claim for this season
    dup_result = await db.execute(
        select(func.count(Claim.id))
        .where(
            Claim.farmer_id == claim.farmer_id,
            Claim.id != cid,
            Claim.season == claim.season,
            Claim.year == claim.year,
            Claim.status.in_(["SUBMITTED", "UNDER_REVIEW", "AUTO_APPROVED", "APPROVED"]),
        )
    )
    dup_count = dup_result.scalar() or 0
    gates["no_duplicate_season"] = dup_count == 0

    # Gate 6: Photo GPS validation (if coordinates exist)
    photo_gps_ok = True
    if farmer and farmer.latitude and farmer.longitude:
        photo_check = await validate_photo_gps(
            claim_id, float(farmer.latitude), float(farmer.longitude), db=db
        )
        gates["photo_gps_valid"] = photo_check["all_valid"]
        photo_gps_ok = photo_check["all_valid"]
    else:
        gates["photo_gps_valid"] = False
        photo_gps_ok = False

    # Gate 7: Claimed area <= registered area * 1.1
    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.farmer_id == claim.farmer_id)
    )
    udlrn = udlrn_result.scalar_one_or_none()
    registered_area = float(udlrn.land_area_ha) if udlrn and udlrn.land_area_ha else 0
    claimed_area = float(claim.affected_area or 0)
    gates["area_within_tolerance"] = claimed_area <= (registered_area * 1.1)

    # Determine eligibility
    all_pass = all(gates.values())
    failed = [k for k, v in gates.items() if not v]

    if all_pass:
        return {
            "eligible": True,
            "reason": "All auto-approval gates passed",
            "gates": gates,
        }
    else:
        return {
            "eligible": False,
            "reason": f"Auto-approval blocked: {', '.join(failed)}",
            "gates": gates,
            "failed_gates": failed,
        }
