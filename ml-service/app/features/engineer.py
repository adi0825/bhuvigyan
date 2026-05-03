"""
47-feature engineer for the Bhuvigyan ensemble (spec §4).

Takes:
  - satellite analysis dict (from GeeClient.analyze)
  - land-record dict (from state-router-service)
  - claim metadata (dates, crop, amounts, csc counter, policy count)
  - rolling fraud-rate snapshots (from claims-service analytics)

Produces: ordered list[float] matching FEATURE_NAMES, used to feed the models.
"""
from __future__ import annotations

from datetime import date
from statistics import mean, pstdev
from typing import Any

from .crop_calendar import phenology_match


# ---------------------------------------------------------------------------
# Deterministic feature ordering — DO NOT REORDER without retraining models.
# ---------------------------------------------------------------------------
FEATURE_NAMES: list[str] = [
    # NDVI timeline stats (12)
    "ndvi_at_sowing", "ndvi_at_claim", "ndvi_delta",
    "ndvi_max_in_season", "ndvi_min_in_season",
    "ndvi_std_dev", "ndvi_trend_slope", "ndvi_auc",
    "ndvi_peak_day_offset", "ndvi_weeks_above_05",
    "ndvi_dropoff_magnitude", "ndvi_recovery_index",

    # SAR (4)
    "sar_vv_mean", "sar_vh_mean",
    "sar_backscatter_delta", "sar_used_flag",

    # Area / polygon (4)
    "area_satellite_ha", "area_rtc_ha",
    "area_delta_pct", "area_ratio",

    # Crop phenology / calendar (3)
    "crop_phenology_match", "season_length_days", "damage_to_sowing_days",

    # Land use / mutation (3)
    "land_use_code", "mutation_recency_days", "is_frozen_udlrn",

    # CSC / policy (3)
    "csc_operator_daily_claim_count", "csc_historical_fraud_rate",
    "owner_active_policy_count",

    # Baseline comparisons (4)
    "historical_ndvi_baseline_mean", "ndvi_vs_baseline_delta",
    "ndvi_vs_baseline_zscore", "baseline_coverage_years",

    # Cloud / data quality (2)
    "cloud_cover_pct", "data_quality_score",

    # Rolling geo fraud rates (4)
    "district_fraud_rate_30d", "village_fraud_rate_30d",
    "state_fraud_rate_30d", "taluk_fraud_rate_30d",

    # Claim amount signals (3)
    "claim_amount_vs_expected_ratio", "claim_amount_vs_area_ratio",
    "claim_amount_percentile_district",

    # Misc (5)
    "days_since_last_claim_same_udlrn", "past_claims_count",
    "past_fraud_claims_count", "aadhaar_name_similarity",
    "damage_type_code",
]

assert len(FEATURE_NAMES) == 47, f"Expected 47 features, got {len(FEATURE_NAMES)}"


LAND_USE_MAP = {"agricultural": 0, "non-agricultural": 1, "forest": 2, "govt": 3}
DAMAGE_MAP   = {"FLOOD": 0, "DROUGHT": 1, "PEST": 2, "HAIL": 3,
                "CYCLONE": 4, "FIRE": 5, "OTHER": 6}


def engineer(
    satellite: dict[str, Any],
    land_record: dict[str, Any] | None,
    claim: dict[str, Any],
    rolling: dict[str, Any] | None = None,
) -> tuple[list[float], dict[str, float]]:
    """Return (feature_vector_ordered, named_dict)."""
    rolling = rolling or {}
    land_record = land_record or {}

    timeline = satellite.get("timeline") or []
    ndvi_vals = [float(p["ndvi"]) for p in timeline]
    ndvi_sowing = float(satellite.get("ndvi_sowing") or 0.0)
    ndvi_claim  = float(satellite.get("ndvi_claim")  or 0.0)
    ndvi_delta  = float(satellite.get("ndvi_delta")  or (ndvi_sowing - ndvi_claim))

    ndvi_max = max(ndvi_vals) if ndvi_vals else 0.0
    ndvi_min = min(ndvi_vals) if ndvi_vals else 0.0
    ndvi_std = pstdev(ndvi_vals) if len(ndvi_vals) >= 2 else 0.0
    ndvi_trend = _slope(ndvi_vals)
    ndvi_auc   = sum(ndvi_vals)
    ndvi_peak_offset = float(ndvi_vals.index(ndvi_max)) if ndvi_vals else 0.0
    weeks_above_05 = sum(1 for v in ndvi_vals if v > 0.5)
    ndvi_dropoff = max(0.0, ndvi_max - ndvi_claim)
    ndvi_recovery = ndvi_claim / ndvi_max if ndvi_max > 0 else 0.0

    sowing_date = _parse_date(claim.get("sowing_date"))
    claim_date  = _parse_date(claim.get("claim_date") or claim.get("damage_date"))

    season_length = (claim_date - sowing_date).days if sowing_date and claim_date else 0
    damage_to_sowing_days = season_length

    area_sat = float(satellite.get("area_satellite_ha") or 0.0)
    area_rtc = float(land_record.get("landAreaHa") or 0.0)
    area_delta_pct = _safe_pct(area_rtc - area_sat, area_sat)
    area_ratio     = area_rtc / area_sat if area_sat > 0 else 0.0

    land_use_code = LAND_USE_MAP.get(str(land_record.get("landUseType", "agricultural")).lower(), 0)
    mutation_date = _parse_date(land_record.get("mutationDate"))
    mutation_recency = (claim_date - mutation_date).days if mutation_date and claim_date else 9999.0
    is_frozen = 1 if land_record.get("isFrozen") else 0

    baseline = (rolling.get("ndvi_baseline") or {})
    baseline_vals = [float(v) for v in baseline.values()] if isinstance(baseline, dict) else []
    baseline_mean = mean(baseline_vals) if baseline_vals else ndvi_sowing
    baseline_std  = pstdev(baseline_vals) if len(baseline_vals) >= 2 else 0.1
    baseline_z    = (ndvi_claim - baseline_mean) / baseline_std if baseline_std else 0.0

    cloud_cover = float(satellite.get("cloud_cover_pct") or 0.0)
    data_quality = max(0.0, 1 - cloud_cover / 100.0)

    claim_amount = float(claim.get("claim_amount_requested") or 0.0)
    expected_per_ha = float(rolling.get("expected_payout_per_ha") or 15000)
    expected_total  = max(1.0, expected_per_ha * area_sat)
    amount_ratio_expected = claim_amount / expected_total
    amount_vs_area = claim_amount / area_sat if area_sat else 0.0

    vec = [
        ndvi_sowing, ndvi_claim, ndvi_delta,
        ndvi_max, ndvi_min, ndvi_std, ndvi_trend, ndvi_auc,
        ndvi_peak_offset, float(weeks_above_05), ndvi_dropoff, ndvi_recovery,

        _f(satellite.get("sar_vv_mean")), _f(satellite.get("sar_vh_mean")),
        _f(satellite.get("sar_backscatter_delta")),
        1.0 if satellite.get("sar_used") else 0.0,

        area_sat, area_rtc, area_delta_pct, area_ratio,

        float(phenology_match(claim.get("declared_crop", ""), sowing_date or date.today())),
        float(season_length), float(damage_to_sowing_days),

        float(land_use_code), float(mutation_recency), float(is_frozen),

        float(rolling.get("csc_daily_claim_count", 0)),
        float(rolling.get("csc_historical_fraud_rate", 0.0)),
        float(rolling.get("owner_active_policy_count", 1)),

        baseline_mean, (ndvi_claim - baseline_mean), baseline_z,
        float(len(baseline_vals)),

        cloud_cover, data_quality,

        float(rolling.get("district_fraud_rate_30d", 0.05)),
        float(rolling.get("village_fraud_rate_30d",  0.05)),
        float(rolling.get("state_fraud_rate_30d",    0.05)),
        float(rolling.get("taluk_fraud_rate_30d",    0.05)),

        amount_ratio_expected, amount_vs_area,
        float(rolling.get("claim_amount_percentile_district", 50.0)),

        float(rolling.get("days_since_last_claim_same_udlrn", 9999)),
        float(rolling.get("past_claims_count", 0)),
        float(rolling.get("past_fraud_claims_count", 0)),
        float(rolling.get("aadhaar_name_similarity", 1.0)),
        float(DAMAGE_MAP.get(str(claim.get("damage_type", "OTHER")).upper(), 6)),
    ]

    assert len(vec) == len(FEATURE_NAMES), \
        f"vector length {len(vec)} != feature count {len(FEATURE_NAMES)}"
    return vec, dict(zip(FEATURE_NAMES, vec))


# ---------------------------------------------------------------------------
def _slope(xs: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x = (n - 1) / 2.0
    mean_y = sum(xs) / n
    num = sum((i - mean_x) * (v - mean_y) for i, v in enumerate(xs))
    den = sum((i - mean_x) ** 2 for i in range(n))
    return num / den if den else 0.0


def _safe_pct(num: float, den: float) -> float:
    if den == 0:
        return 0.0
    return (num / den) * 100.0


def _f(v: Any) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _parse_date(v: Any) -> date | None:
    if v is None:
        return None
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None
