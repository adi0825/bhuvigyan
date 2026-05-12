from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database import get_db
from app.dependencies import require_admin_role
from app.models.claim import Claim
from app.models.fraud_scoring import FraudScore
from typing import Optional

router = APIRouter()

@router.get("/reports/fraud-trend")
async def fraud_trend(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text(f"""
        SELECT DATE(created_at) as date,
               AVG(fraud_score)::float as avg_score,
               COUNT(*)::int as claim_count
        FROM claims
        WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
          AND fraud_score IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"date": str(r["date"]), "avgScore": r["avg_score"], "claimCount": r["claim_count"]} for r in rows]}

@router.get("/reports/district-heatmap")
async def district_heatmap(
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text("""
        SELECT f.district, COUNT(*)::int as claim_count, AVG(c.fraud_score)::float as avg_score
        FROM claims c
        JOIN farmers f ON c.farmer_id = f.id
        WHERE c.fraud_score IS NOT NULL
        GROUP BY f.district
        ORDER BY avg_score DESC
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"district": r["district"] or "Unknown", "claimCount": r["claim_count"], "avgScore": r["avg_score"]} for r in rows]}

@router.get("/reports/reviewer-productivity")
async def reviewer_productivity(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    user = Depends(require_admin_role),
):
    result = await db.execute(text(f"""
        SELECT reviewer_id, COUNT(*)::int as decisions,
               AVG(EXTRACT(EPOCH FROM (decided_at - filed_at))/3600)::float as avg_hours
        FROM claims
        WHERE decided_at IS NOT NULL
          AND decided_at >= CURRENT_DATE - INTERVAL '{days} days'
        GROUP BY reviewer_id
    """))
    rows = result.mappings().fetchall()
    return {"success": True, "data": [{"reviewerId": str(r["reviewer_id"]), "decisions": r["decisions"], "avgHours": r["avg_hours"]} for r in rows]}
