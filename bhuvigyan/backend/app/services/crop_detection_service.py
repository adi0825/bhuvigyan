import datetime
from typing import Dict, Any, List, Optional
from app.core.logging import logger


# Common Indian crop NDVI signatures (typical ranges during peak growth)
CROP_SIGNATURES = {
    "Sugarcane": {"peak_ndvi": (0.6, 0.85), "season": "Kharif", "growth_months": [5, 6, 7, 8, 9, 10]},
    "Paddy (Rice)": {"peak_ndvi": (0.45, 0.75), "season": "Kharif", "growth_months": [6, 7, 8, 9, 10]},
    "Wheat": {"peak_ndvi": (0.5, 0.8), "season": "Rabi", "growth_months": [11, 12, 1, 2, 3]},
    "Cotton": {"peak_ndvi": (0.5, 0.75), "season": "Kharif", "growth_months": [6, 7, 8, 9, 10, 11]},
    "Maize": {"peak_ndvi": (0.5, 0.7), "season": "Kharif", "growth_months": [6, 7, 8, 9]},
    "Soybean": {"peak_ndvi": (0.5, 0.7), "season": "Kharif", "growth_months": [6, 7, 8, 9]},
    "Groundnut": {"peak_ndvi": (0.35, 0.6), "season": "Kharif", "growth_months": [6, 7, 8, 9, 10]},
    "Mustard": {"peak_ndvi": (0.4, 0.65), "season": "Rabi", "growth_months": [11, 12, 1, 2]},
    "Chickpea (Gram)": {"peak_ndvi": (0.35, 0.6), "season": "Rabi", "growth_months": [11, 12, 1, 2, 3]},
    "Potato": {"peak_ndvi": (0.4, 0.65), "season": "Rabi", "growth_months": [11, 12, 1, 2]},
    "Onion": {"peak_ndvi": (0.35, 0.55), "season": "Rabi", "growth_months": [11, 12, 1, 2, 3]},
    "Tur (Arhar)": {"peak_ndvi": (0.4, 0.65), "season": "Kharif", "growth_months": [6, 7, 8, 9, 10, 11]},
    "Moong": {"peak_ndvi": (0.35, 0.6), "season": "Kharif", "growth_months": [6, 7, 8, 9]},
    "Jowar (Sorghum)": {"peak_ndvi": (0.4, 0.65), "season": "Kharif", "growth_months": [6, 7, 8, 9, 10]},
    "Bajra (Pearl Millet)": {"peak_ndvi": (0.35, 0.6), "season": "Kharif", "growth_months": [6, 7, 8, 9]},
}


def detect_crop_mix(
    zones: List[Dict],
    declared_crop: Optional[str] = None,
    declared_secondary_crop: Optional[str] = None,
    season: Optional[str] = None,
    sowing_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Multi-crop detection engine.
    Takes NDVI zones from satellite analysis and produces a crop composition breakdown.
    Uses farmer's declared crop as a prior to guide zone labeling.
    Never forces a single crop answer when evidence does not support it.
    """
    if not zones:
        return {
            "crops": [],
            "confidence": 0.0,
            "flag": "No active crop detected",
            "intercropping": False
        }

    # Check if entire land is bare soil
    total_pixels = sum(z.get("pixel_count", 1) for z in zones)
    bare_soil_pct = sum(
        z.get("pixel_count", 1) for z in zones
        if z.get("ndvi_mean", 0) < 0.1
    ) / max(total_pixels, 1) * 100

    if bare_soil_pct >= 90:
        today = datetime.date.today().isoformat()
        # Find last crop signature from zones with any vegetation
        last_crop_date = None
        for z in zones:
            if z.get("ndvi_mean", 0) >= 0.1:
                last_crop_date = today
                break

        return {
            "crops": [{
                "name": "No active crop",
                "percentage": round(bare_soil_pct, 1),
                "zone": "Entire land unit",
                "ndvi_range": "0.0–0.1"
            }],
            "confidence": 0.9,
            "flag": f"No active crop detected as of {today}. Last crop signature observed on {last_crop_date or 'unknown'}.",
            "intercropping": False,
            "bare_soil_pct": round(bare_soil_pct, 1)
        }

    crops = []
    current_month = datetime.date.today().month

    for zone in zones:
        ndvi = zone.get("ndvi_mean", 0)
        area_pct = zone.get("area_pct", 0)
        zone_id = zone.get("zone_id", "?")

        if ndvi < 0.1:
            # Bare soil zone
            crops.append({
                "name": "Bare soil",
                "percentage": round(area_pct, 1),
                "zone": f"Zone {zone_id}",
                "ndvi_range": f"{max(0, ndvi - 0.05):.2f}–{ndvi + 0.05:.2f}"
            })
            continue

        if ndvi < 0.15:
            # Very sparse — boundary vegetation likely
            crops.append({
                "name": "Boundary vegetation",
                "percentage": round(area_pct, 1),
                "zone": f"Zone {zone_id}",
                "ndvi_range": f"{ndvi - 0.05:.2f}–{ndvi + 0.05:.2f}"
            })
            continue

        # Try to match with declared crop first
        matched_crop = None
        if declared_crop:
            sig = CROP_SIGNATURES.get(declared_crop)
            if sig:
                lo, hi = sig["peak_ndvi"]
                if lo <= ndvi <= hi:
                    matched_crop = declared_crop

        # If no declared crop match, find best signature match
        if not matched_crop:
            matched_crop = _match_crop_signature(ndvi, current_month, season)

        # If still no match, label generically
        if not matched_crop:
            if ndvi >= 0.6:
                matched_crop = "Dense vegetation (unclassified)"
            elif ndvi >= 0.3:
                matched_crop = "Growing crop (unclassified)"
            else:
                matched_crop = "Sparse vegetation"

        crops.append({
            "name": matched_crop,
            "percentage": round(area_pct, 1),
            "zone": f"Zone {zone_id}",
            "ndvi_range": f"{max(0, ndvi - 0.05):.2f}–{ndvi + 0.05:.2f}"
        })

    # Check for intercropping
    crop_names = [c["name"] for c in crops if c["name"] not in ("Bare soil", "Boundary vegetation")]
    intercropping = len(crop_names) >= 2

    # If farmer declared secondary crop, add it
    if declared_secondary_crop and intercropping:
        secondary_present = any(declared_secondary_crop in c["name"] for c in crops)
        if not secondary_present and len(crops) > 1:
            # Label the second-largest vegetation zone as the secondary crop
            veg_zones = [c for c in crops if c["name"] not in ("Bare soil", "Boundary vegetation")]
            if len(veg_zones) >= 2:
                veg_zones.sort(key=lambda c: c["percentage"], reverse=True)
                veg_zones[1]["name"] = declared_secondary_crop

    # Compute confidence
    confidence = _compute_confidence(zones, crops, declared_crop, season)

    # Build primary/secondary/boundary breakdown
    primary = None
    secondary = None
    boundary = None
    for c in sorted(crops, key=lambda x: x["percentage"], reverse=True):
        if c["name"] in ("Bare soil", "Boundary vegetation"):
            if not boundary:
                boundary = c
            continue
        if not primary:
            primary = c
        elif not secondary:
            secondary = c

    result = {
        "crops": crops,
        "primary_crop": primary,
        "secondary_crop": secondary,
        "boundary_vegetation": boundary,
        "intercropping": intercropping,
        "confidence": round(confidence, 2),
        "flag": None
    }

    # Low confidence warning
    if confidence < 0.6:
        result["flag"] = (
            f"Mixed crop detected. Classification confidence low at "
            f"{round(confidence * 100)}%. Please verify on ground for confirmation."
        )

    return result


def _match_crop_signature(ndvi: float, current_month: int, season: Optional[str] = None) -> Optional[str]:
    """Match NDVI value against known crop signatures."""
    best_match = None
    best_score = 0

    for crop_name, sig in CROP_SIGNATURES.items():
        lo, hi = sig["peak_ndvi"]
        if not (lo <= ndvi <= hi):
            continue

        # Score based on how centered the NDVI is in the range
        center = (lo + hi) / 2
        range_half = (hi - lo) / 2
        distance = abs(ndvi - center) / max(range_half, 0.01)
        ndvi_score = max(0, 1 - distance)

        # Bonus for matching season
        month_score = 1.0 if current_month in sig.get("growth_months", []) else 0.3
        if season and sig.get("season", "").lower() == season.lower():
            month_score = 1.0

        score = ndvi_score * 0.6 + month_score * 0.4

        if score > best_score:
            best_score = score
            best_match = crop_name

    return best_match


def _compute_confidence(
    zones: List[Dict],
    crops: List[Dict],
    declared_crop: Optional[str],
    season: Optional[str]
) -> float:
    """
    Compute classification confidence (0.0 to 1.0).
    Higher when:
    - Declared crop matches detected signature
    - Zones are well-separated (distinct NDVI ranges)
    - Season matches crop calendar
    Lower when:
    - Mixed/overlapping zones
    - No declared crop to validate against
    - Low vegetation overall
    """
    confidence = 0.5  # baseline

    # Bonus: declared crop matches
    if declared_crop:
        crop_names = [c["name"] for c in crops]
        if declared_crop in crop_names:
            confidence += 0.2
        # Partial match
        elif any(declared_crop in name or name in declared_crop for name in crop_names):
            confidence += 0.1

    # Bonus: season matches
    if season and declared_crop:
        sig = CROP_SIGNATURES.get(declared_crop)
        if sig and sig.get("season", "").lower() == season.lower():
            confidence += 0.1

    # Penalty: too many zones (uncertainty)
    veg_zones = [z for z in zones if z.get("ndvi_mean", 0) >= 0.1]
    if len(veg_zones) > 3:
        confidence -= 0.1

    # Penalty: low overall NDVI
    mean_ndvi = sum(z.get("ndvi_mean", 0) * z.get("pixel_count", 1) for z in zones) / max(
        sum(z.get("pixel_count", 1) for z in zones), 1
    )
    if mean_ndvi < 0.2:
        confidence -= 0.15

    # Penalty: no declared crop
    if not declared_crop:
        confidence -= 0.1

    return max(0.0, min(1.0, confidence))
