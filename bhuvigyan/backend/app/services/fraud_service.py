from typing import Dict, Any, List, Optional


def compute_fraud_score(
    ndvi_data: Dict,
    timeseries_data: Dict,
    polygon_data: Dict,
    claimed_area_ha: Optional[float] = None,
    claimed_crop: Optional[str] = None
) -> Dict[str, Any]:
    """
    Compute fraud score 0-100 from multiple signals.
    Higher = more suspicious.
    """
    score = 0.0
    factors = []
    weights = {}

    # ── Factor 1: Vegetation anomaly (NDVI mean) ─────────
    ndvi_mean = (ndvi_data.get("ndvi") or {}).get("mean")
    if ndvi_mean is not None:
        if ndvi_mean < 0.15:
            score += 35
            factors.append({
                "factor": "vegetation_anomaly",
                "weight": 35,
                "detail": (
                    f"NDVI {ndvi_mean:.3f} — "
                    "No vegetation detected. "
                    "Crop claim is suspect."
                ),
                "severity": "critical"
            })
        elif ndvi_mean < 0.25:
            score += 20
            factors.append({
                "factor": "low_vegetation",
                "weight": 20,
                "detail": (
                    f"NDVI {ndvi_mean:.3f} — "
                    "Very sparse vegetation."
                ),
                "severity": "high"
            })
        elif ndvi_mean < 0.35:
            score += 8
            factors.append({
                "factor": "moderate_vegetation",
                "weight": 8,
                "detail": (
                    f"NDVI {ndvi_mean:.3f} — "
                    "Below healthy threshold."
                ),
                "severity": "low"
            })

    # ── Factor 2: Temporal anomalies ─────────────────────
    anomalies = timeseries_data.get("anomalies", [])
    if anomalies:
        high_count = sum(
            1 for a in anomalies
            if a.get("severity") == "high"
        )
        medium_count = sum(
            1 for a in anomalies
            if a.get("severity") == "medium"
        )
        anom_score = min(25, high_count * 12 +
                         medium_count * 5)
        if anom_score > 0:
            score += anom_score
            factors.append({
                "factor": "temporal_anomaly",
                "weight": anom_score,
                "detail": (
                    f"{len(anomalies)} temporal anomaly(ies) "
                    f"detected in NDVI history. "
                    f"High: {high_count}, "
                    f"Medium: {medium_count}."
                ),
                "anomaly_dates": [
                    a["date"] for a in anomalies
                ],
                "severity": (
                    "high" if high_count > 0 else "medium"
                )
            })

    # ── Factor 3: NDVI variability (too uniform = suspect) ─
    ndvi_std = (ndvi_data.get("ndvi") or {}).get("std_dev")
    if ndvi_std is not None and ndvi_mean is not None:
        if ndvi_std < 0.02 and ndvi_mean > 0.3:
            score += 10
            factors.append({
                "factor": "uniform_ndvi",
                "weight": 10,
                "detail": (
                    "Suspiciously uniform NDVI across land holding. "
                    "May indicate synthetic data."
                ),
                "severity": "medium"
            })

    # ── Factor 4: Area mismatch ───────────────────────────
    actual_area = polygon_data.get("area_ha")
    if claimed_area_ha and actual_area:
        ratio = claimed_area_ha / actual_area
        if ratio > 1.5 or ratio < 0.5:
            area_score = min(20, abs(ratio - 1) * 15)
            score += area_score
            factors.append({
                "factor": "area_mismatch",
                "weight": round(area_score, 1),
                "detail": (
                    f"Claimed area {claimed_area_ha:.2f} Ha "
                    f"vs actual {actual_area:.2f} Ha "
                    f"(ratio: {ratio:.2f}). "
                    "Significant mismatch detected."
                ),
                "severity": (
                    "high" if abs(ratio - 1) > 1
                    else "medium"
                )
            })

    # ── Factor 5: NDWI flood anomaly ─────────────────────
    ndwi_mean = (ndvi_data.get("ndwi") or {}).get("mean")
    if ndwi_mean is not None and ndwi_mean > 0.3:
        score += 8
        factors.append({
            "factor": "flood_signal",
            "weight": 8,
            "detail": (
                f"NDWI {ndwi_mean:.3f} indicates "
                "waterlogging / flood. "
                "Verify against flood claim."
            ),
            "severity": "medium"
        })

    # ── Score banding ─────────────────────────────────────
    score = min(100, round(score, 1))
    if score >= 70:
        band = "HIGH_RISK"
        recommendation = (
            "Immediate field inspection required. "
            "Strong indicators of fraudulent claim."
        )
    elif score >= 40:
        band = "MEDIUM_RISK"
        recommendation = (
            "Further satellite analysis and "
            "document verification recommended."
        )
    elif score >= 20:
        band = "LOW_RISK"
        recommendation = (
            "Minor inconsistencies detected. "
            "Standard verification process."
        )
    else:
        band = "CLEAN"
        recommendation = (
            "No significant anomalies. "
            "Claim appears consistent with satellite data."
        )

    return {
        "fraud_score": score,
        "band": band,
        "recommendation": recommendation,
        "factors": factors,
        "factor_count": len(factors),
        "ndvi_mean": ndvi_mean,
        "ndwi_mean": ndwi_mean,
        "anomaly_count": len(anomalies),
        "actual_area_ha": actual_area
    }
