"""
Bhuvigyan V7 — 47-Feature Assembler
Extracts all fraud features from claim + inspection + satellite + weather + history.
"""
import math
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.claim import Claim
from app.models.farmer import Farmer
from app.models.policy import Policy
from app.models.inspection import Inspection
from app.models.cce_visit import CceVisit
from app.models.fraud_scoring import FraudFeatureSnapshot
from app.models.weather_satellite import WeatherCache, SatelliteCache
from app.models.claim_document import ClaimDocument


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def assemble_features(claim_id: str, db: AsyncSession) -> Dict[str, Any]:
    """Assemble the full 47-feature vector for a given claim."""
    from uuid import UUID
    cid = UUID(claim_id)

    # 1. Load claim
    claim_result = await db.execute(select(Claim).where(Claim.id == cid))
    claim: Optional[Claim] = claim_result.scalar_one_or_none()
    if not claim:
        raise ValueError(f"Claim {claim_id} not found")

    # 2. Load farmer
    farmer_result = await db.execute(select(Farmer).where(Farmer.id == claim.farmer_id))
    farmer: Optional[Farmer] = farmer_result.scalar_one_or_none()

    # 3. Load policy
    policy: Optional[Policy] = None
    if claim.policy_id:
        policy_result = await db.execute(select(Policy).where(Policy.id == claim.policy_id))
        policy = policy_result.scalar_one_or_none()

    # 4. Load inspection (most recent completed)
    inspection_result = await db.execute(
        select(Inspection)
        .where(Inspection.claim_id == cid)
        .order_by(Inspection.completed_at.desc())
    )
    inspection: Optional[Inspection] = inspection_result.scalar_one_or_none()

    # 5. Load farmer claim history
    history_result = await db.execute(
        select(Claim)
        .where(Claim.farmer_id == claim.farmer_id, Claim.id != cid)
        .order_by(Claim.created_at.desc())
    )
    history_claims = history_result.scalars().all()

    # 6. Load satellite cache — fetch fresh from GEE if missing or stale (>6h)
    lat = float(claim.gps_latitude) if claim.gps_latitude else None
    lng = float(claim.gps_longitude) if claim.gps_longitude else None
    sat_cache: Optional[SatelliteCache] = None
    if lat and lng:
        sat_result = await db.execute(
            select(SatelliteCache)
            .where(
                SatelliteCache.lat == lat,
                SatelliteCache.lng == lng,
            )
            .order_by(SatelliteCache.cached_at.desc())
        )
        sat_cache = sat_result.scalar_one_or_none()

        # Fetch fresh if missing or stale (>6 hours)
        if not sat_cache or (datetime.utcnow() - sat_cache.cached_at).total_seconds() > 21600:
            try:
                from app.services.satellite_service import SatelliteService
                svc = SatelliteService()
                ndvi_data = svc.get_ndvi_current(lat, lng)
                ndwi_data = svc.get_ndwi(lat, lng)
                sar_data = svc.get_sar_flood(lat, lng)

                # Build ndvi_values from timeseries if available
                ts_data = svc.get_ndvi_timeseries(lat, lng, months=3)
                ndvi_values = [d["ndvi"] for d in ts_data] if ts_data else []

                mean_ndvi = float(ndvi_data.get("ndvi", 0)) if isinstance(ndvi_data, dict) else 0.0
                cc = float(ndvi_data.get("cloud_cover_pct", 0)) if isinstance(ndvi_data, dict) else None
                anomaly = bool(sar_data.get("flood_detected")) if isinstance(sar_data, dict) else False

                # Upsert cache
                if sat_cache:
                    sat_cache.mean_ndvi = mean_ndvi
                    sat_cache.cloud_cover_pct = cc
                    sat_cache.ndvi_values = ndvi_values
                    sat_cache.anomaly_detected = anomaly
                    sat_cache.cached_at = datetime.utcnow()
                else:
                    sat_cache = SatelliteCache(
                        lat=lat,
                        lng=lng,
                        start_date=datetime.utcnow().date(),
                        end_date=datetime.utcnow().date(),
                        mean_ndvi=mean_ndvi,
                        cloud_cover_pct=cc,
                        ndvi_values=ndvi_values,
                        anomaly_detected=anomaly,
                        is_mock=False,
                        cached_at=datetime.utcnow(),
                    )
                    db.add(sat_cache)
                await db.flush()
            except Exception as e:
                logger = __import__("logging").getLogger(__name__)
                logger.warning(f"Failed to fetch fresh satellite data: {e}")

    # 7. Load weather cache
    weather_result = await db.execute(
        select(WeatherCache)
        .where(
            WeatherCache.lat == (lat or 0),
            WeatherCache.lng == (lng or 0),
            WeatherCache.date == claim.loss_date,
        )
        .order_by(WeatherCache.cached_at.desc())
    )
    weather_cache: Optional[WeatherCache] = weather_result.scalar_one_or_none()

    # 8. Load geo-cluster claims (same GPS within 100m in 90 days)
    geo_cluster_result = await db.execute(
        select(Claim).where(
            Claim.id != cid,
            Claim.created_at >= datetime.utcnow() - timedelta(days=90),
        )
    )
    geo_claims = geo_cluster_result.scalars().all()
    geo_cluster_count = 0
    geo_cluster_diff_farmers = 0
    same_gps_3plus = False
    if claim.gps_latitude and claim.gps_longitude:
        for gc in geo_claims:
            if gc.gps_latitude and gc.gps_longitude:
                d = _haversine_km(claim.gps_latitude, claim.gps_longitude, gc.gps_latitude, gc.gps_longitude)
                if d <= 0.1:
                    geo_cluster_count += 1
                    if gc.farmer_id != claim.farmer_id:
                        geo_cluster_diff_farmers += 1
        if geo_cluster_count >= 3:
            same_gps_3plus = True

    # === Feature assembly ===
    now = datetime.utcnow()
    farmer_tenure_days = (now - farmer.created_at).days if farmer else 0
    total_claims_ever = len(history_claims)
    approved_claims = [c for c in history_claims if c.status in ("APPROVED", "AUTO_APPROVED")]
    approved_ratio = len(approved_claims) / total_claims_ever if total_claims_ever else 0.0
    claim_amounts = [float(c.claim_amount_requested or 0) for c in history_claims if c.claim_amount_requested]
    avg_claim_amount = sum(claim_amounts) / len(claim_amounts) if claim_amounts else 0.0
    claim_freq_90d = sum(1 for c in history_claims if c.created_at and c.created_at >= now - timedelta(days=90))
    last_claim = history_claims[0] if history_claims else None
    days_since_last = (now - last_claim.created_at).days if last_claim else 999
    prior_fraud_flags = sum(1 for c in history_claims if (c.fraud_score or 0) > 60)
    claim_variance = (sum((x - avg_claim_amount) ** 2 for x in claim_amounts) / len(claim_amounts)) ** 0.5 / avg_claim_amount if avg_claim_amount else 0.0
    claim_count_this_season = sum(1 for c in history_claims if c.season == claim.season and c.year == claim.year)

    # Policy features
    claim_amount_ratio = 0.0
    affected_area_ratio = 0.0
    days_after_start = 0
    days_before_end = 0
    policy_tenure = 0
    sum_insured_per_ha = 0.0
    if policy:
        claim_amount_ratio = float(claim.claim_amount_requested or 0) / float(policy.sum_insured) if policy.sum_insured else 0.0
        affected_area_ratio = float(claim.affected_area or 0) / float(policy.insured_area) if policy.insured_area else 0.0
        if claim.loss_date and policy.start_date:
            days_after_start = (claim.loss_date - policy.start_date).days
        if claim.loss_date and policy.end_date:
            days_before_end = (policy.end_date - claim.loss_date).days
        policy_tenure = (policy.end_date - policy.start_date).days if policy.end_date and policy.start_date else 0
        sum_insured_per_ha = float(policy.sum_insured) / float(policy.insured_area) if policy.insured_area else 0.0

    # Satellite features
    ndvi_sowing = None
    ndvi_claim = float(sat_cache.mean_ndvi) if sat_cache and sat_cache.mean_ndvi else None
    ndvi_drop = None
    ndvi_anomaly = False
    ndvi_mismatch = False
    sar_flood_signal = None
    ndvi_trend_30d = None
    cloud_cover = None
    if sat_cache and sat_cache.ndvi_values:
        ndvi_values = sat_cache.ndvi_values
        if isinstance(ndvi_values, list) and len(ndvi_values) >= 2:
            ndvi_sowing = float(ndvi_values[0]) if ndvi_values[0] else None
            if ndvi_claim and ndvi_sowing:
                ndvi_drop = ndvi_sowing - ndvi_claim
                ndvi_anomaly = ndvi_drop > 0.15
        if ndvi_claim and claim.damage_percent:
            ndvi_mismatch = ndvi_drop and ndvi_drop < 0.15 and float(claim.damage_percent) > 50
        sar_flood_signal = sat_cache.anomaly_detected if hasattr(sat_cache, 'anomaly_detected') else None
        # Cloud cover from real NDVI response (stored in cache as extra field if available)
        if hasattr(sat_cache, 'cloud_cover_pct') and sat_cache.cloud_cover_pct is not None:
            cloud_cover = float(sat_cache.cloud_cover_pct)

    # Weather features
    rainfall_loss = float(weather_cache.rainfall_mm) if weather_cache and weather_cache.rainfall_mm else None
    rainfall_7d = None
    weather_mismatch = False
    extreme_weather = False
    temp_max = float(weather_cache.temperature) if weather_cache and weather_cache.temperature else None
    humidity = float(weather_cache.humidity) if weather_cache and weather_cache.humidity else None
    if claim.damage_cause and claim.damage_cause.upper() == "FLOOD" and rainfall_loss is not None:
        weather_mismatch = rainfall_loss == 0 or rainfall_loss < 5

    # Inspection features
    officer_loss_diff = None
    discrepancy_flag = False
    inspection_gps_dist = None
    inspection_photo_count = 0
    photo_gps_variance = 0.0
    if inspection:
        if claim.damage_percent and inspection.actual_loss_pct:
            officer_loss_diff = abs(float(inspection.actual_loss_pct) - float(claim.damage_percent))
            discrepancy_flag = officer_loss_diff > 20
        if claim.gps_latitude and claim.gps_longitude and inspection.gps_latitude and inspection.gps_longitude:
            inspection_gps_dist = _haversine_km(
                claim.gps_latitude, claim.gps_longitude,
                inspection.gps_latitude, inspection.gps_longitude
            )
        # Photo count from claim_documents
        docs_result = await db.execute(
            select(ClaimDocument).where(ClaimDocument.claim_id == cid)
        )
        docs = docs_result.scalars().all()
        inspection_photo_count = len(docs)
        gps_vals = []
        for d in docs:
            if d.gps_latitude and d.gps_longitude:
                gps_vals.append((float(d.gps_latitude), float(d.gps_longitude)))
        if len(gps_vals) > 1:
            mean_lat = sum(g[0] for g in gps_vals) / len(gps_vals)
            mean_lng = sum(g[1] for g in gps_vals) / len(gps_vals)
            photo_gps_variance = sum((g[0] - mean_lat) ** 2 + (g[1] - mean_lng) ** 2 for g in gps_vals) / len(gps_vals)

    # Temporal / behavioral
    filed_hour = claim.filed_at.hour if claim.filed_at else now.hour
    weekend_filed = claim.filed_at.weekday() >= 5 if claim.filed_at else False
    days_between_loss_file = (claim.filed_at.date() - claim.loss_date).days if claim.filed_at and claim.loss_date else 0

    # Network / anomaly
    network_anomaly = 0.0
    if avg_claim_amount and claim.claim_amount_requested:
        network_anomaly = (float(claim.claim_amount_requested) - avg_claim_amount) / (avg_claim_amount or 1)

    features = {
        # A. Policy and Claim (1-8)
        "claim_amount_ratio": round(claim_amount_ratio, 4),
        "affected_area_ratio": round(affected_area_ratio, 4),
        "days_after_policy_start": days_after_start,
        "days_before_policy_end": days_before_end,
        "policy_tenure_days": policy_tenure,
        "declared_crop_risk": 0.0,  # populated externally from district stats
        "sum_insured_per_hectare": round(sum_insured_per_ha, 2),
        "claim_count_this_season": claim_count_this_season,

        # B. Farmer History (9-16)
        "total_claims_ever": total_claims_ever,
        "approved_claims_ratio": round(approved_ratio, 4),
        "avg_claim_amount": round(avg_claim_amount, 2),
        "claim_frequency_90d": claim_freq_90d,
        "days_since_last_claim": days_since_last,
        "farmer_tenure_days": farmer_tenure_days,
        "prior_fraud_flags": prior_fraud_flags,
        "claim_amount_variance": round(claim_variance, 4),

        # C. Geospatial (17-24)
        "gps_distance_from_parcel": 0.0,  # needs UDLRN centroid lookup
        "geo_cluster_count_90d": geo_cluster_count,
        "geo_cluster_different_farmers": geo_cluster_diff_farmers,
        "same_gps_3plus_claims": int(same_gps_3plus),
        "district_fraud_rate": 0.0,  # from aggregate stats
        "taluk_claim_density": 0.0,
        "state_risk_index": 0.0,
        "distance_to_nearest_water_body": None,

        # D. Satellite (25-32)
        "ndvi_sowing": round(ndvi_sowing, 4) if ndvi_sowing is not None else None,
        "ndvi_claim": round(ndvi_claim, 4) if ndvi_claim is not None else None,
        "ndvi_drop": round(ndvi_drop, 4) if ndvi_drop is not None else None,
        "ndvi_anomaly": int(ndvi_anomaly),
        "ndvi_mismatch": int(ndvi_mismatch),
        "sar_flood_signal": int(sar_flood_signal) if sar_flood_signal is not None else None,
        "ndvi_trend_30d": round(ndvi_trend_30d, 6) if ndvi_trend_30d is not None else None,
        "cloud_cover_pct": round(cloud_cover, 4) if cloud_cover is not None else None,

        # E. Weather (33-38)
        "rainfall_loss_date_mm": round(rainfall_loss, 2) if rainfall_loss is not None else None,
        "rainfall_7d_total": round(rainfall_7d, 2) if rainfall_7d is not None else None,
        "weather_mismatch": int(weather_mismatch),
        "extreme_weather_event": int(extreme_weather),
        "temp_max_loss_date": round(temp_max, 2) if temp_max is not None else None,
        "humidity_loss_date": round(humidity, 4) if humidity is not None else None,

        # F. Inspection Discrepancy (39-43)
        "officer_loss_pct_diff": round(officer_loss_diff, 2) if officer_loss_diff is not None else None,
        "discrepancy_flag": int(discrepancy_flag),
        "inspection_gps_distance": round(inspection_gps_dist, 4) if inspection_gps_dist is not None else None,
        "inspection_photo_count": inspection_photo_count,
        "inspection_photo_gps_variance": round(photo_gps_variance, 6),

        # G. Temporal/Behavioral (44-46)
        "claim_filed_hour": filed_hour,
        "weekend_filed": int(weekend_filed),
        "days_between_loss_and_file": days_between_loss_file,

        # H. Network/Anomaly (47)
        "network_anomaly_score": round(network_anomaly, 4),
    }

    return features
