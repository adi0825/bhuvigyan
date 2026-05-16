"""
Conservative satellite confidence engine.
Reduces false alerts by requiring multi-signal agreement before strong conclusions.
Does not modify existing models or routes — wraps raw satellite data with confidence scoring.
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _is_cloud_contaminated(ndvi_data: dict) -> tuple:
    """Check if NDVI is likely contaminated by clouds."""
    cloud = ndvi_data.get("cloud_cover_pct", 0)
    if isinstance(cloud, (int, float)) and cloud > 25:
        return True, f"Cloud cover {cloud}% > 25%"
    source = str(ndvi_data.get("source", ""))
    if "Simulated" in source or "fallback" in source.lower():
        return True, "Simulated/fallback data used"
    return False, ""


def _is_stale(scan_date: Optional[str], max_days: int = 30) -> tuple:
    """Check if scan date is stale."""
    if not scan_date:
        return True, "Missing scan date"
    try:
        d = datetime.strptime(scan_date[:10], "%Y-%m-%d")
        age = (datetime.utcnow() - d).days
        if age > max_days:
            return True, f"Data is {age} days old"
    except Exception:
        return True, "Unparseable scan date"
    return False, ""


def _signal_agreement(*signals: bool) -> float:
    """Return fraction of True signals."""
    if not signals:
        return 0.0
    return sum(1 for s in signals if s) / len(signals)


def _ndvi_confidence(ndvi_data: dict) -> float:
    """Score 0-1 for NDVI data quality."""
    score = 1.0
    cloud = ndvi_data.get("cloud_cover_pct", 0)
    if isinstance(cloud, (int, float)):
        score -= _clamp(cloud / 100.0, 0, 0.5)
    source = str(ndvi_data.get("source", ""))
    if "Simulated" in source or "fallback" in source.lower():
        score -= 0.4
    scan_date = ndvi_data.get("scan_date")
    if scan_date:
        try:
            d = datetime.strptime(scan_date[:10], "%Y-%m-%d")
            age = (datetime.utcnow() - d).days
            score -= _clamp(age / 90.0, 0, 0.3)
        except Exception:
            score -= 0.2
    return _clamp(score, 0, 1)


def _ndwi_confidence(ndwi_data: dict) -> float:
    """Score 0-1 for NDWI data quality."""
    score = 1.0
    source = str(ndwi_data.get("source", ""))
    if "Simulated" in source or "fallback" in source.lower():
        score -= 0.4
    scan_date = ndwi_data.get("scan_date")
    if scan_date:
        try:
            d = datetime.strptime(scan_date[:10], "%Y-%m-%d")
            age = (datetime.utcnow() - d).days
            score -= _clamp(age / 90.0, 0, 0.3)
        except Exception:
            score -= 0.2
    return _clamp(score, 0, 1)


def _sar_confidence(sar_data: dict) -> float:
    """Score 0-1 for SAR data quality."""
    score = 1.0
    source = str(sar_data.get("source", ""))
    if "Simulated" in source or "fallback" in source.lower():
        score -= 0.4
    scan_date = sar_data.get("scan_date")
    if scan_date:
        try:
            d = datetime.strptime(scan_date[:10], "%Y-%m-%d")
            age = (datetime.utcnow() - d).days
            score -= _clamp(age / 30.0, 0, 0.4)  # SAR is more time-sensitive
        except Exception:
            score -= 0.2
    return _clamp(score, 0, 1)


def compute_flood_confidence(
    sar_data: dict,
    ndwi_data: dict,
    ndvi_data: dict,
    historical_ndwi: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Conservative flood confidence.
    Requires:
      - NDWI water-like signal
      - SAR confirmation
      - No contradiction with NDVI (healthy crops = no flood)
      - Optional: deviation from historical NDWI baseline
    Returns dict with flood_detected, confidence, risk_level, reason, manual_review_required.
    """
    warnings: List[str] = []

    # Extract values safely
    sar_detected = bool(sar_data.get("flood_detected", False))
    sar_conf = float(sar_data.get("confidence", 0))
    ndwi_val = float(ndwi_data.get("ndwi", 0)) if isinstance(ndwi_data, dict) else 0
    ndvi_val = float(ndvi_data.get("ndvi", 0)) if isinstance(ndvi_data, dict) else 0

    # Data quality scores
    sar_qual = _sar_confidence(sar_data)
    ndwi_qual = _ndwi_confidence(ndwi_data)
    ndvi_qual = _ndvi_confidence(ndvi_data)

    # Quality warnings
    if sar_qual < 0.6:
        warnings.append("SAR data quality low")
    if ndwi_qual < 0.6:
        warnings.append("NDWI data quality low")
    if ndvi_qual < 0.6:
        warnings.append("NDVI data quality low")

    # Signal checks
    ndwi_water_signal = ndwi_val > 0.1
    ndvi_contradicts = ndvi_val > 0.6  # healthy vegetation contradicts flood
    ndwi_contradicts = ndwi_val < -0.2  # very dry contradicts flood

    # Historical deviation (if provided)
    historical_deviation = False
    if historical_ndwi and len(historical_ndwi) >= 2:
        baseline = sum(historical_ndwi) / len(historical_ndwi)
        deviation = abs(ndwi_val - baseline)
        historical_deviation = deviation > 0.15
        if not historical_deviation:
            warnings.append("No significant NDWI change from baseline")

    # Count agreeing signals for flood
    flood_signals = []
    if sar_detected:
        flood_signals.append("SAR")
    if ndwi_water_signal:
        flood_signals.append("NDWI")
    if historical_deviation:
        flood_signals.append("Historical deviation")

    # Contradiction signals
    contradict_signals = []
    if ndvi_contradicts:
        contradict_signals.append("NDVI healthy")
    if ndwi_contradicts:
        contradict_signals.append("NDWI very dry")

    # Compute weighted confidence
    raw_conf = sar_conf * 0.4 + ndwi_qual * 0.3 + ndvi_qual * 0.3

    # Downgrade if contradictions exist
    if contradict_signals:
        raw_conf *= 0.3
        warnings.append(f"Contradiction: {', '.join(contradict_signals)}")

    # Decision logic
    if len(flood_signals) >= 2 and not contradict_signals and raw_conf > 0.5:
        return {
            "flood_detected": True,
            "confidence": round(_clamp(raw_conf, 0, 1), 2),
            "risk_level": "High" if raw_conf > 0.75 else "Medium",
            "reason": f"Agreed signals: {', '.join(flood_signals)}",
            "manual_review_required": raw_conf < 0.7,
            "quality_warnings": warnings,
            "signal_count": len(flood_signals),
            "contradiction_count": len(contradict_signals),
        }

    if len(flood_signals) == 1 and not contradict_signals:
        return {
            "flood_detected": False,
            "confidence": round(_clamp(raw_conf * 0.6, 0, 1), 2),
            "risk_level": "Medium",
            "reason": f"Only 1 signal ({flood_signals[0]}): possible water stress / low confidence",
            "manual_review_required": True,
            "quality_warnings": warnings,
            "signal_count": len(flood_signals),
            "contradiction_count": len(contradict_signals),
        }

    # Default: no strong evidence
    reason = "No strong flood evidence"
    if contradict_signals:
        reason = f"Contradicted by: {', '.join(contradict_signals)}"
    elif flood_signals:
        reason = f"Weak signal from {flood_signals[0]} only"

    return {
        "flood_detected": False,
        "confidence": round(_clamp(raw_conf * 0.4, 0, 1), 2),
        "risk_level": "Low",
        "reason": reason,
        "manual_review_required": False,
        "quality_warnings": warnings,
        "signal_count": len(flood_signals),
        "contradiction_count": len(contradict_signals),
    }


def compute_crop_confidence(
    ndvi_data: dict,
    state: str = "",
    historical_ndvi: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Conservative crop classification using multi-temporal logic.
    If historical NDVI shows two distinct peaks, flag mixed cropping.
    Returns primary crop, secondary crop, confidence, mixed flag.
    """
    warnings: List[str] = []
    ndvi_val = float(ndvi_data.get("ndvi", 0.5)) if isinstance(ndvi_data, dict) else 0.5
    state = (state or "").strip()

    # Data quality
    ndvi_qual = _ndvi_confidence(ndvi_data)
    if ndvi_qual < 0.6:
        warnings.append("NDVI data quality low for crop classification")

    # Single-image classification
    def _classify_single(ndvi: float, st: str) -> str:
        # Bare soil / empty land — no crop
        if ndvi < 0.15:
            return "No vegetation / Empty land"
        if ndvi > 0.6:
            if st in {"PB", "HR", "UP", "MP", "Punjab", "Haryana", "Uttar Pradesh", "Madhya Pradesh"}:
                return "Wheat"
            if st in {"MH", "KA", "TN", "AP", "Maharashtra", "Karnataka", "Tamil Nadu", "Andhra Pradesh"}:
                return "Sugarcane"
            return "Paddy"
        if ndvi > 0.4:
            if st in {"MH", "GJ", "RJ", "Maharashtra", "Gujarat", "Rajasthan"}:
                return "Cotton"
            if st in {"KA", "TG", "MP", "Karnataka", "Telangana", "Madhya Pradesh"}:
                return "Soybean"
            if st in {"PB", "HR", "Punjab", "Haryana"}:
                return "Maize"
            return "Groundnut"
        if ndvi > 0.25:
            if st in {"RJ", "GJ", "MH", "Rajasthan", "Gujarat", "Maharashtra"}:
                return "Bajra"
            if st in {"KA", "AP", "TG", "Karnataka", "Andhra Pradesh", "Telangana"}:
                return "Jowar"
            return "Maize"
        # NDVI 0.15–0.25: very sparse / fallow
        if st in {"RJ", "GJ", "Rajasthan", "Gujarat"}:
            return "Fallow / Sparse"
        return "Early Growth / Mixed"

    primary = _classify_single(ndvi_val, state)
    secondary = None
    mixed = False

    # Empty land detection — drastically lower confidence and warn
    is_empty_land = ndvi_val < 0.15
    if is_empty_land:
        warnings.append(f"NDVI {ndvi_val:.2f} indicates bare soil or no vegetation — crop classification unreliable")

    # Multi-temporal check
    if historical_ndvi and len(historical_ndvi) >= 3:
        # Look for two distinct peaks (bimodal distribution)
        sorted_vals = sorted(historical_ndvi)
        low_vals = sorted_vals[: max(1, len(sorted_vals) // 2)]
        high_vals = sorted_vals[len(sorted_vals) // 2 :]
        low_mean = sum(low_vals) / len(low_vals) if low_vals else 0
        high_mean = sum(high_vals) / len(high_vals) if high_vals else 0
        gap = high_mean - low_mean

        if gap > 0.25:
            mixed = True
            warnings.append("Multi-temporal NDVI shows bimodal pattern — possible mixed crops or boundary vegetation")
            # Classify high and low periods separately
            primary = _classify_single(high_mean, state)
            secondary = _classify_single(low_mean, state)
            if secondary == primary:
                secondary = "Boundary vegetation / Fallow patch"
        elif gap < 0.1:
            warnings.append("NDVI temporal variation very low — field may be uniform or data sparse")
    else:
        warnings.append("Single-image classification only — multi-temporal data unavailable")

    # Confidence based on data quality + temporal richness
    temporal_bonus = 0.2 if (historical_ndvi and len(historical_ndvi) >= 6) else 0.1 if (historical_ndvi and len(historical_ndvi) >= 3) else 0.0
    confidence = _clamp(ndvi_qual * 0.7 + temporal_bonus, 0, 1)

    # Downgrade confidence if mixed
    if mixed:
        confidence *= 0.8

    # Simulated/fallback data cannot reliably classify crops
    source = str(ndvi_data.get("source", ""))
    if "Simulated" in source or "fallback" in source.lower():
        confidence = min(confidence, 0.25)
        warnings.append("Simulated data — crop type cannot be verified without real satellite imagery")

    # Empty land: cap confidence very low — we cannot classify a crop on bare soil
    if is_empty_land:
        confidence = min(confidence, 0.15)

    manual_review = confidence < 0.5 or mixed or is_empty_land

    return {
        "primary_crop": primary,
        "secondary_crop": secondary,
        "mixed_crop_flag": mixed,
        "confidence": round(confidence, 2),
        "manual_review_required": manual_review,
        "quality_warnings": warnings,
        "classification_basis": "multi-temporal" if (historical_ndvi and len(historical_ndvi) >= 3) else "single-image",
    }


def compute_analysis_confidence(
    ndvi_data: dict,
    ndwi_data: dict,
    sar_data: dict,
    fire_data: dict,
    historical_ndvi: Optional[List[float]] = None,
    historical_ndwi: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Master confidence computation for a full satellite analysis.
    Returns top-level confidence scores and quality warnings.
    """
    warnings: List[str] = []

    # Per-signal confidence
    ndvi_conf = _ndvi_confidence(ndvi_data)
    ndwi_conf = _ndwi_confidence(ndwi_data)
    sar_conf = _sar_confidence(sar_data)

    # Data quality checks
    cloud_bad, cloud_msg = _is_cloud_contaminated(ndvi_data)
    if cloud_bad:
        warnings.append(cloud_msg)

    ndvi_stale, ndvi_stale_msg = _is_stale(ndvi_data.get("scan_date"))
    if ndvi_stale:
        warnings.append(f"NDVI stale: {ndvi_stale_msg}")

    ndwi_stale, ndwi_stale_msg = _is_stale(ndwi_data.get("scan_date"))
    if ndwi_stale:
        warnings.append(f"NDWI stale: {ndwi_stale_msg}")

    sar_stale, sar_stale_msg = _is_stale(sar_data.get("scan_date"), max_days=14)
    if sar_stale:
        warnings.append(f"SAR stale: {sar_stale_msg}")

    # Signal agreement check
    signals = []
    if ndvi_conf > 0.5:
        signals.append("NDVI")
    if ndwi_conf > 0.5:
        signals.append("NDWI")
    if sar_conf > 0.5:
        signals.append("SAR")

    if len(signals) < 2:
        warnings.append(f"Only {len(signals)} strong signal(s): {', '.join(signals) or 'none'}")

    # Overall confidence = weighted average, penalized for missing signals
    overall = (ndvi_conf * 0.35 + ndwi_conf * 0.25 + sar_conf * 0.4)
    if len(signals) < 2:
        overall *= 0.6
    if len(signals) < 1:
        overall *= 0.3

    overall = _clamp(overall, 0, 1)

    # Fire is a separate alert — keep it simple
    fire_detected = bool(fire_data.get("fire_detected", False)) if isinstance(fire_data, dict) else False
    fire_conf = 1.0 if fire_detected else 0.0
    if isinstance(fire_data, dict) and fire_data.get("source", "").startswith("Simulated"):
        fire_conf = 0.3
        warnings.append("Fire alert from simulated data")

    return {
        "analysis_confidence": round(overall, 2),
        "flood_confidence": None,  # computed separately via compute_flood_confidence
        "crop_confidence": None,   # computed separately via compute_crop_confidence
        "fire_confidence": round(fire_conf, 2),
        "signal_count": len(signals),
        "strong_signals": signals,
        "quality_warnings": warnings,
        "manual_review_required": overall < 0.5 or len(warnings) > 2,
    }


def wrap_analysis_with_confidence(
    analysis: dict,
    state: str = "",
    historical_ndvi: Optional[List[float]] = None,
    historical_ndwi: Optional[List[float]] = None,
) -> dict:
    """
    Wrap a raw satellite analysis dict with conservative confidence scoring.
    Non-destructive: all original keys are preserved; new keys are added.
    """
    ndvi = analysis.get("ndvi", {}) or {}
    ndwi = analysis.get("ndwi", {}) or {}
    sar = analysis.get("sar_flood", {}) or {}
    fire = analysis.get("fire_alerts", {}) or {}

    # Master confidence
    master = compute_analysis_confidence(ndvi, ndwi, sar, fire, historical_ndvi, historical_ndwi)

    # Flood confidence
    flood = compute_flood_confidence(sar, ndwi, ndvi, historical_ndwi)

    # Crop confidence
    crop = compute_crop_confidence(ndvi, state, historical_ndvi)

    # Merge into analysis
    analysis["analysis_confidence"] = master["analysis_confidence"]
    analysis["flood_confidence"] = flood["confidence"]
    analysis["crop_confidence"] = crop["confidence"]
    analysis["mixed_crop_flag"] = crop["mixed_crop_flag"]
    analysis["manual_review_required"] = master["manual_review_required"] or flood["manual_review_required"] or crop["manual_review_required"]
    analysis["quality_warnings"] = list(set(master["quality_warnings"] + flood["quality_warnings"] + crop["quality_warnings"]))

    # Conservative display labels
    if flood["flood_detected"]:
        analysis["flood_display"] = {
            "label": "Possible flood signal" if flood["confidence"] < 0.7 else "Flood risk detected",
            "risk_level": flood["risk_level"],
            "confidence": flood["confidence"],
            "reason": flood["reason"],
        }
    else:
        analysis["flood_display"] = {
            "label": "No strong flood evidence",
            "risk_level": "Low",
            "confidence": flood["confidence"],
            "reason": flood["reason"],
        }

    # Conservative crop display label
    def _crop_label(crop_result: dict) -> str:
        if crop_result["primary_crop"] == "No vegetation / Empty land":
            return "No vegetation detected — land appears empty"
        if crop_result["mixed_crop_flag"]:
            return f"Mixed crops: {crop_result['primary_crop']} + {crop_result['secondary_crop']}"
        return f"Main crop likely {crop_result['primary_crop']}"

    analysis["crop_display"] = {
        "primary": crop["primary_crop"],
        "secondary": crop["secondary_crop"],
        "mixed": crop["mixed_crop_flag"],
        "confidence": crop["confidence"],
        "label": _crop_label(crop),
        "review_needed": crop["manual_review_required"],
    }

    # Override raw sar_flood with conservative version
    analysis["sar_flood"] = {
        **sar,
        "flood_detected": flood["flood_detected"],
        "confidence": flood["confidence"],
        "risk_level": flood["risk_level"],
        "reason": flood["reason"],
        "manual_review_required": flood["manual_review_required"],
    }

    return analysis
