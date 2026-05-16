from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

CROP_NDVI_SIGNATURES = {
    "Paddy (Rice)": {"peak_months": [7, 8, 9, 10, 11], "peak_ndvi_range": [0.45, 0.85], "harvest_months": [11, 12, 1], "harvest_ndvi_drop": 0.25, "confidence_weight": 1.0},
    "Wheat": {"peak_months": [2, 3, 4], "peak_ndvi_range": [0.35, 0.70], "harvest_months": [4, 5], "harvest_ndvi_drop": 0.20, "confidence_weight": 1.0},
    "Sugarcane": {"peak_months": [6, 7, 8, 9, 10, 11, 12], "peak_ndvi_range": [0.50, 0.90], "harvest_months": [12, 1, 2, 3], "harvest_ndvi_drop": 0.15, "confidence_weight": 1.0},
    "Cotton": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.40, 0.75], "harvest_months": [10, 11, 12], "harvest_ndvi_drop": 0.30, "confidence_weight": 1.0},
    "Groundnut": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.35, 0.65], "harvest_months": [10, 11, 12], "harvest_ndvi_drop": 0.25, "confidence_weight": 1.0},
    "Maize": {"peak_months": [7, 8, 9], "peak_ndvi_range": [0.40, 0.80], "harvest_months": [9, 10, 11], "harvest_ndvi_drop": 0.20, "confidence_weight": 1.0},
    "Sorghum (Jowar)": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.30, 0.60], "harvest_months": [10, 11], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.9},
    "Pearl Millet (Bajra)": {"peak_months": [8, 9], "peak_ndvi_range": [0.25, 0.55], "harvest_months": [9, 10], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.9},
    "Chickpea (Gram)": {"peak_months": [1, 2, 3], "peak_ndvi_range": [0.30, 0.60], "harvest_months": [3, 4], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.9},
    "Mustard": {"peak_months": [2, 3], "peak_ndvi_range": [0.35, 0.65], "harvest_months": [3, 4], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.9},
    "Lentil (Masoor)": {"peak_months": [2, 3], "peak_ndvi_range": [0.30, 0.55], "harvest_months": [3, 4], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.85},
    "Soybean": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.40, 0.75], "harvest_months": [10, 11], "harvest_ndvi_drop": 0.25, "confidence_weight": 0.9},
    "Tur (Pigeon Pea)": {"peak_months": [10, 11, 12], "peak_ndvi_range": [0.35, 0.70], "harvest_months": [12, 1, 2], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.9},
    "Moong (Green Gram)": {"peak_months": [3, 4, 9, 10], "peak_ndvi_range": [0.30, 0.60], "harvest_months": [4, 5, 10, 11], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.85},
    "Urad (Black Gram)": {"peak_months": [3, 4, 9, 10], "peak_ndvi_range": [0.30, 0.60], "harvest_months": [4, 5, 10, 11], "harvest_ndvi_drop": 0.20, "confidence_weight": 0.85},
    "Banana": {"peak_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "peak_ndvi_range": [0.60, 0.90], "harvest_ndvi_drop": 0.10, "confidence_weight": 0.9},
}


def detect_crop_mix(ndvi_zones: List[Dict], declared_crop: str, season: str, sowing_date: str = None) -> Dict[str, Any]:
    import datetime
    now = datetime.date.today()
    current_month = now.month
    zones = ndvi_zones if ndvi_zones else []
    total_pixels = sum(z.get("pixel_count", 1) for z in zones) or 1
    crops_detected = []
    bare_soil_pct = 0.0
    intercropping = False

    for zone in zones:
        ndvi = zone.get("ndvi_mean", 0)
        pixel_count = zone.get("pixel_count", 1)
        area_pct = zone.get("area_pct", 0)
        matched_crop, confidence = _match_crop_signature(ndvi, current_month, declared_crop)
        if matched_crop == "Bare soil / No crop":
            bare_soil_pct = area_pct
            continue
        crops_detected.append({"name": matched_crop, "confidence": round(confidence, 2), "area_pct": round(area_pct, 1)})

    if len(crops_detected) > 1:
        max_conf = max(c.get("confidence", 0) for c in crops_detected)
        second_conf = sorted([c.get("confidence", 0) for c in crops_detected], reverse=True)[1] if len(crops_detected) > 1 else 0
        if second_conf > max_conf * 0.6 and max_conf < 0.85:
            intercropping = True

    if not crops_detected:
        primary = declared_crop or "Unknown"
        primary_conf = 0.3
    else:
        crops_detected.sort(key=lambda x: x["confidence"], reverse=True)
        primary = crops_detected[0]["name"]
        primary_conf = crops_detected[0]["confidence"]

    return {
        "primary_crop": primary,
        "primary_confidence": round(primary_conf, 2),
        "crops": crops_detected,
        "bare_soil_pct": round(bare_soil_pct, 1),
        "intercropping_detected": intercropping,
        "declared_crop_match": primary.lower() == (declared_crop or "").lower(),
        "season_consistency": _check_season_consistency(primary, season, current_month)
    }


def _match_crop_signature(ndvi: float, month: int, declared_crop: str = None):
    if ndvi < 0.05:
        return "Bare soil / No crop", 0.95
    best_crop = None
    best_score = 0
    for crop, sig in CROP_NDVI_SIGNATURES.items():
        score = 0
        lo, hi = sig["peak_ndvi_range"]
        if lo <= ndvi <= hi:
            score += 0.5
        elif ndvi < lo:
            score += max(0, 0.5 - (lo - ndvi) * 2)
        else:
            score += max(0, 0.5 - (ndvi - hi) * 2)
        if month in sig["peak_months"]:
            score += 0.3
        else:
            nearest = min([abs(month - m) for m in sig["peak_months"]])
            score += max(0, 0.3 - nearest * 0.05)
        if declared_crop and crop.lower() in declared_crop.lower():
            score += 0.2
        score *= sig["confidence_weight"]
        if score > best_score:
            best_score = score
            best_crop = crop
    if not best_crop:
        best_crop = "Mixed vegetation"
        best_score = max(0, ndvi)
    confidence = min(0.95, best_score)
    return best_crop, confidence


def _compute_confidence(ndvi: float, month: int, sig: Dict) -> float:
    score = 0
    lo, hi = sig["peak_ndvi_range"]
    if lo <= ndvi <= hi:
        score += 0.5
    elif ndvi < lo:
        score += max(0, 0.5 - (lo - ndvi) * 2)
    else:
        score += max(0, 0.5 - (ndvi - hi) * 2)
    if month in sig["peak_months"]:
        score += 0.3
    else:
        nearest = min([abs(month - m) for m in sig["peak_months"]])
        score += max(0, 0.3 - nearest * 0.05)
    return min(0.95, score * sig["confidence_weight"])


def _check_season_consistency(crop: str, season: str, month: int) -> str:
    rabi_months = {1, 2, 3, 4, 5}
    kharif_months = {6, 7, 8, 9, 10, 11}
    zaid_months = {3, 4, 5, 6}
    if not season:
        return "unknown"
    season_lower = season.lower()
    if season_lower == "kharif" and month in kharif_months:
        return "consistent"
    if season_lower == "rabi" and month in rabi_months:
        return "consistent"
    if season_lower == "zaid" and month in zaid_months:
        return "consistent"
    if season_lower == "year_round":
        return "consistent"
    return "verify"
