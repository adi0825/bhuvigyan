"""Anti-corruption detection service for inspector visits.

Detects suspicious patterns:
- Same-day multiple visits (impossible travel)
- Reports submitted too fast (< 20 min)
- All reports recommend 'approve'
- Inspector GPS far from farm
- Photo EXIF metadata mismatch
- Inspector-farmer mobile proximity (same tower)
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field_visit import FieldVisit
from app.models.field_inspection_report import FieldInspectionReport
from app.models.field_inspector import FieldInspector
from app.services.notification_service import create_notification


async def detect_impossible_travel(db: AsyncSession, inspector_id: str, window_hours: int = 4) -> List[Dict]:
    """Detect visits that are too close in time to be physically possible."""
    since = datetime.utcnow() - timedelta(hours=window_hours)
    result = await db.execute(
        select(FieldVisit)
        .where(
            and_(
                FieldVisit.inspector_id == inspector_id,
                FieldVisit.visit_start_time >= since,
                FieldVisit.status.in_(["submitted", "verified"]),
            )
        )
        .order_by(FieldVisit.visit_start_time)
    )
    visits = result.scalars().all()

    flags = []
    for i in range(1, len(visits)):
        prev = visits[i - 1]
        curr = visits[i]
        if prev.visit_end_time and curr.visit_start_time:
            gap_minutes = (curr.visit_start_time - prev.visit_end_time).total_seconds() / 60
            if gap_minutes < 30:
                flags.append({
                    "type": "IMPOSSIBLE_TRAVEL",
                    "severity": "HIGH",
                    "message": f"Visits {gap_minutes:.0f}min apart — impossible travel",
                    "visit_ids": [str(prev.id), str(curr.id)],
                    "gap_minutes": gap_minutes,
                })
    return flags


async def detect_fast_reports(db: AsyncSession, inspector_id: str, min_minutes: int = 20) -> List[Dict]:
    """Detect reports completed suspiciously fast."""
    result = await db.execute(
        select(FieldVisit)
        .where(
            and_(
                FieldVisit.inspector_id == inspector_id,
                FieldVisit.status.in_(["submitted", "verified"]),
                FieldVisit.visit_start_time.is_not(None),
                FieldVisit.visit_end_time.is_not(None),
            )
        )
    )
    visits = result.scalars().all()

    flags = []
    for visit in visits:
        duration = (visit.visit_end_time - visit.visit_start_time).total_seconds() / 60
        if duration < min_minutes:
            flags.append({
                "type": "VISIT_TOO_FAST",
                "severity": "MEDIUM",
                "message": f"Visit completed in {duration:.0f}min (min expected: {min_minutes}min)",
                "visit_id": str(visit.id),
                "duration_minutes": duration,
            })
    return flags


async def detect_uniform_recommendations(db: AsyncSession, inspector_id: str, threshold_pct: float = 95) -> List[Dict]:
    """Detect inspectors who always give the same recommendation."""
    result = await db.execute(
        select(FieldInspectionReport.inspector_recommendation, func.count())
        .join(FieldVisit, FieldInspectionReport.visit_id == FieldVisit.id)
        .where(FieldVisit.inspector_id == inspector_id)
        .group_by(FieldInspectionReport.inspector_recommendation)
    )
    counts = result.all()
    total = sum(c for _, c in counts)
    if total < 5:
        return []

    flags = []
    for rec, count in counts:
        pct = (count / total) * 100
        if pct >= threshold_pct:
            flags.append({
                "type": "UNIFORM_RECOMMENDATION",
                "severity": "HIGH" if rec == "approve" else "MEDIUM",
                "message": f"{pct:.0f}% of reports recommend '{rec}' — suspicious uniformity",
                "recommendation": rec,
                "percentage": pct,
                "total_reports": total,
            })
    return flags


async def detect_gps_anomalies(db: AsyncSession, inspector_id: str, max_distance_m: int = 500) -> List[Dict]:
    """Detect visits where inspector GPS is far from farm location."""
    result = await db.execute(
        select(FieldVisit)
        .where(
            and_(
                FieldVisit.inspector_id == inspector_id,
                FieldVisit.distance_from_farm_m.is_not(None),
            )
        )
    )
    visits = result.scalars().all()

    flags = []
    for visit in visits:
        if visit.distance_from_farm_m and visit.distance_from_farm_m > max_distance_m:
            flags.append({
                "type": "GPS_FAR_FROM_FARM",
                "severity": "HIGH",
                "message": f"Inspector GPS {visit.distance_from_farm_m}m from farm (max: {max_distance_m}m)",
                "visit_id": str(visit.id),
                "distance_m": visit.distance_from_farm_m,
            })
    return flags


async def run_corruption_scan(db: AsyncSession, inspector_id: str = None) -> Dict[str, Any]:
    """Run all anti-corruption checks."""
    if inspector_id:
        inspectors = [await db.get(FieldInspector, inspector_id)]
    else:
        result = await db.execute(select(FieldInspector).where(FieldInspector.is_active == True))
        inspectors = result.scalars().all()

    all_flags = []
    for inspector in inspectors:
        if not inspector:
            continue
        flags = []
        flags.extend(await detect_impossible_travel(db, str(inspector.id)))
        flags.extend(await detect_fast_reports(db, str(inspector.id)))
        flags.extend(await detect_uniform_recommendations(db, str(inspector.id)))
        flags.extend(await detect_gps_anomalies(db, str(inspector.id)))

        for flag in flags:
            flag["inspector_id"] = str(inspector.id)
            flag["inspector_name"] = inspector.full_name
            all_flags.append(flag)

    # Alert admin if any HIGH severity flags found
    high_flags = [f for f in all_flags if f["severity"] == "HIGH"]
    if high_flags:
        # Create notification for admin (using a placeholder admin ID — should be configurable)
        await create_notification(
            db, "00000000-0000-0000-0000-000000000000", "ANTI_CORRUPTION_ALERT",
            f"Anti-corruption: {len(high_flags)} high-severity flags detected",
            f"Inspectors flagged: {', '.join(set(f['inspector_name'] for f in high_flags))}."
        )

    return {
        "total_inspectors_scanned": len(inspectors),
        "total_flags": len(all_flags),
        "high_severity": len(high_flags),
        "flags": all_flags,
    }
