from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

CROP_SIGNATURES = {
    "Paddy (Rice)": {"peak_months": [7, 8, 9, 10, 11], "peak_ndvi_range": [0.40, 0.85], "sar_vv_range": [-12, -8], "confidence_weight": 1.0},
    "Wheat": {"peak_months": [2, 3, 4], "peak_ndvi_range": [0.30, 0.70], "sar_vv_range": [-15, -10], "confidence_weight": 1.0},
    "Sugarcane": {"peak_months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "peak_ndvi_range": [0.35, 0.90], "sar_vv_range": [-10, -5], "confidence_weight": 1.2},
    "Cotton": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.35, 0.75], "sar_vv_range": [-14, -9], "confidence_weight": 1.0},
    "Groundnut": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.30, 0.65], "sar_vv_range": [-16, -11], "confidence_weight": 1.0},
    "Maize": {"peak_months": [7, 8, 9], "peak_ndvi_range": [0.35, 0.80], "sar_vv_range": [-13, -8], "confidence_weight": 1.0},
    "Soybean": {"peak_months": [8, 9, 10], "peak_ndvi_range": [0.35, 0.75], "sar_vv_range": [-15, -10], "confidence_weight": 0.9},
    "Moong (Green Gram)": {"peak_months": [3, 4, 9, 10], "peak_ndvi_range": [0.25, 0.60], "sar_vv_range": [-18, -14], "confidence_weight": 0.85},
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
        "declared_crop_match": None if not declared_crop else primary.lower() == declared_crop.lower(),
        "season_consistency": _check_season_consistency(primary, season, current_month)
    }


def _match_crop_signature(ndvi: float, month: int, declared_crop: str = None, detected_season: str = "Unknown", sar_vv: float = None):
    if ndvi < 0.1:
        return "Bare soil / No crop", 0.95
    best_crop = None
    best_score = 0
    for crop, sig in CROP_SIGNATURES.items():
        score = 0
        
        # 1. NDVI Score (0.4 weight)
        lo, hi = sig["peak_ndvi_range"]
        if lo <= ndvi <= hi:
            score += 0.4
        elif ndvi < lo:
            score += max(0, 0.4 - (lo - ndvi) * 2)
        else:
            score += max(0, 0.4 - (ndvi - hi) * 2)
            
        # 2. Season Score (0.3 weight)
        if month in sig["peak_months"]:
            score += 0.3
        else:
            nearest = min([abs(month - m) for m in sig["peak_months"]])
            score += max(0, 0.3 - nearest * 0.05)
            
        # 3. SAR VV Score (0.3 weight) - CRITICAL for high biomass crops like Sugarcane
        if sar_vv is not None:
            s_lo, s_hi = sig["sar_vv_range"]
            if s_lo <= sar_vv <= s_hi:
                score += 0.3
            elif sar_vv < s_lo:
                score += max(0, 0.3 - (s_lo - sar_vv) * 0.1)
            else:
                score += max(0, 0.3 - (sar_vv - s_hi) * 0.1)
        else:
            score += 0.15 # Neutral if no SAR
            
        if declared_crop and crop.lower() in declared_crop.lower():
            score += 0.2
        
        # Seasonal Veto / Penalty
        if detected_season != "Unknown":
            rabi_crops = {"Wheat", "Mustard", "Chickpea (Gram)", "Lentil (Masoor)"}
            kharif_crops = {"Paddy (Rice)", "Cotton", "Groundnut", "Maize", "Soybean"}
            
            if detected_season == "Zaid" and crop in rabi_crops:
                score *= 0.2 # Heavy penalty for Rabi crop in summer
            elif detected_season == "Kharif" and crop in rabi_crops:
                score *= 0.2
            elif detected_season == "Rabi" and crop in kharif_crops:
                score *= 0.4

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
        score += max(0, 0.3 - nearest * 0.02)
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
