"""
Bhuvigyan V7 — State Adapter Service
Loads per-state configuration from DB + Redis cache.
"""
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.state_adapter import StateAdapter
from app.redis_client import redis_client
import json

DEFAULT_ADAPTER = {
    "state_code": "DEFAULT",
    "name": "Default India",
    "min_photos": 1,
    "ndvi_threshold": 0.15,
    "area_tolerance_pct": 10.0,
    "required_fields": [],
    "scheme_mappings": {},
    "routing_rules": {"auto_approve": {"max_amount": 50000}},
    "risk_rules": {"geo_cluster_radius_m": 200, "weather_mismatch_weight": 1.0},
    "language": "en",
    "active": True,
}

CACHE_TTL = 300  # 5 minutes


async def get_adapter(state_code: str, db: AsyncSession) -> Dict[str, Any]:
    if not state_code:
        return DEFAULT_ADAPTER.copy()

    cache_key = f"adapter:{state_code.upper()}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(
        select(StateAdapter).where(StateAdapter.state_code == state_code.upper(), StateAdapter.active == True)
    )
    adapter = result.scalar_one_or_none()

    if adapter:
        config = dict(adapter.config_json)
        config["state_code"] = adapter.state_code
        config["name"] = adapter.name
        config["active"] = adapter.active
    else:
        config = DEFAULT_ADAPTER.copy()

    await redis_client.setex(cache_key, CACHE_TTL, json.dumps(config))
    return config


async def invalidate_cache(state_code: str):
    await redis_client.delete(f"adapter:{state_code.upper()}")


def validate_claim_against_adapter(adapter: Dict[str, Any], claim_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a claim payload against state adapter rules."""
    errors = []
    warnings = []

    # Photo count
    min_photos = adapter.get("min_photos", 1)
    photo_count = claim_data.get("photo_count", 0)
    if photo_count < min_photos:
        errors.append(f"Minimum {min_photos} photos required for {adapter['state_code']}; found {photo_count}")

    # Required fields
    for field in adapter.get("required_fields", []):
        if not claim_data.get(field):
            errors.append(f"Required field '{field}' missing for {adapter['state_code']}")

    # Area tolerance
    tolerance = adapter.get("area_tolerance_pct", 10.0)
    insured = claim_data.get("insured_area", 0)
    affected = claim_data.get("affected_area", 0)
    if insured and affected:
        max_allowed = float(insured) * (1 + tolerance / 100)
        if float(affected) > max_allowed:
            errors.append(f"Affected area {affected} exceeds insured area + {tolerance}% tolerance")

    # NDVI threshold for state
    ndvi_drop = claim_data.get("ndvi_drop")
    if ndvi_drop is not None:
        threshold = adapter.get("ndvi_threshold", 0.15)
        if ndvi_drop < threshold and claim_data.get("damage_percent", 0) > 50:
            warnings.append(f"NDVI drop {ndvi_drop} below state threshold {threshold} but high damage claimed")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}
