import json
import datetime
from typing import Dict, Any, List


def generate_truth_packet(
    farmer_id: str,
    holding: Dict[str, Any],
    ndvi_result: Dict[str, Any],
    crop_mix: Dict[str, Any],
    soil_moisture: str,
    scenes: List[Dict],
    timeline: Dict[str, Any],
    baseline: Dict[str, Any],
    anomalies: List[Dict],
    source: str,
    radar_fallback: bool,
    verification_status: str
) -> Dict[str, Any]:
    now = datetime.datetime.utcnow().isoformat() + "Z"
    truth = {
        "header": {
            "system": "Bhuvigyan Satellite Intelligence",
            "generated_at": now,
            "version": "1.0.0",
            "disclaimer": "This report is generated from satellite data and is for reference only. It does not replace ground truth surveys."
        },
        "farmer": {"farmer_id": farmer_id},
        "land_identity": {
            "state": holding.get("state"),
            "district": holding.get("district"),
            "taluk": holding.get("taluk"),
            "village": holding.get("village"),
            "survey_number": holding.get("survey_number"),
            "land_area_acres_declared": holding.get("land_area_acres"),
            "bhuvan_vid": holding.get("bhuvan_vid"),
            "location_verified": holding.get("location_verified"),
        },
        "crop_analysis": {
            "declared_crop": holding.get("declared_crop"),
            "declared_season": holding.get("season"),
            "sowing_date": holding.get("sowing_date"),
            "has_multiple_crops": holding.get("has_multiple_crops"),
            "secondary_crop": holding.get("secondary_crop"),
            "detected_crop": crop_mix.get("primary_crop") if crop_mix else None,
            "crop_confidence": crop_mix.get("primary_confidence") if crop_mix else None,
            "crop_match": crop_mix.get("declared_crop_match") if crop_mix else None,
            "season_consistency": crop_mix.get("season_consistency") if crop_mix else None,
            "intercropping_detected": crop_mix.get("intercropping_detected") if crop_mix else None,
            "bare_soil_pct": crop_mix.get("bare_soil_pct") if crop_mix else None,
            "crop_mix": crop_mix.get("crops") if crop_mix else [],
        },
        "satellite_data": {
            "source": source,
            "radar_fallback": radar_fallback,
            "ndvi_mean": ndvi_result.get("zones", [{}])[0].get("ndvi_mean") if ndvi_result and ndvi_result.get("zones") else None,
            "ndvi_zones": ndvi_result.get("zones") if ndvi_result else [],
            "soil_moisture": soil_moisture,
            "scenes_count": len(scenes),
            "scenes": scenes,
            "cloud_cover_pct": ndvi_result.get("cloud_cover_pct") if ndvi_result else None,
            "scan_date": ndvi_result.get("scan_date") if ndvi_result else None,
        },
        "timeseries": {
            "months": timeline.get("months") if timeline else None,
            "data_points": timeline.get("count") if timeline else 0,
            "anomalies": anomalies,
            "zone_lines": timeline.get("zone_lines") if timeline else [],
        },
        "historical_baseline": {
            "years": 3,
            "baseline_ndvi_mean": baseline.get("baseline_ndvi_mean") if baseline else None,
            "scene_count": baseline.get("scene_count") if baseline else 0,
            "baseline_source": baseline.get("baseline_source") if baseline else "unavailable",
        },
        "verification": {
            "status": verification_status,
            "recommendation": _verification_recommendation(verification_status, crop_mix, anomalies),
            "flags": _build_flags(crop_mix, anomalies, radar_fallback),
        }
    }
    return truth


def truth_packet_to_text(truth: Dict[str, Any]) -> str:
    lines = []
    h = truth["header"]
    lines.append("=" * 60)
    lines.append("BHUVIGYAN LAND VERIFICATION REPORT")
    lines.append("=" * 60)
    lines.append(f"Generated: {h['generated_at']}")
    lines.append(f"System: {h['system']}")
    lines.append(f"Version: {h['version']}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("FARMER DETAILS")
    lines.append("-" * 40)
    f = truth["farmer"]
    lines.append(f"Farmer ID: {f['farmer_id']}")
    lines.append("")
    li = truth["land_identity"]
    lines.append("-" * 40)
    lines.append("LAND IDENTITY")
    lines.append("-" * 40)
    lines.append(f"State: {li.get('state', 'N/A')}")
    lines.append(f"District: {li.get('district', 'N/A')}")
    lines.append(f"Taluk: {li.get('taluk', 'N/A')}")
    lines.append(f"Village: {li.get('village', 'N/A')}")
    lines.append(f"Survey Number: {li.get('survey_number', 'N/A')}")
    lines.append(f"Declared Area: {li.get('land_area_acres_declared', 'N/A')} acres")
    lines.append(f"Bhuvan VID: {li.get('bhuvan_vid', 'N/A')}")
    lines.append(f"Location Verified: {'Yes' if li.get('location_verified') else 'No'}")
    lines.append("")
    ca = truth["crop_analysis"]
    lines.append("-" * 40)
    lines.append("CROP ANALYSIS")
    lines.append("-" * 40)
    lines.append(f"Declared Crop: {ca.get('declared_crop', 'N/A')}")
    lines.append(f"Declared Season: {ca.get('declared_season', 'N/A')}")
    lines.append(f"Detected Crop: {ca.get('detected_crop', 'N/A')}")
    lines.append(f"Confidence: {ca.get('crop_confidence', 'N/A')}")
    lines.append(f"Crop Match: {'Yes' if ca.get('crop_match') else 'No'}")
    lines.append(f"Season Consistency: {ca.get('season_consistency', 'N/A')}")
    lines.append(f"Intercropping: {'Yes' if ca.get('intercropping_detected') else 'No'}")
    lines.append(f"Bare Soil: {ca.get('bare_soil_pct', 'N/A')}%")
    lines.append("")
    sd = truth["satellite_data"]
    lines.append("-" * 40)
    lines.append("SATELLITE DATA")
    lines.append("-" * 40)
    lines.append(f"Source: {sd.get('source', 'N/A')}")
    lines.append(f"Radar Fallback: {'Yes' if sd.get('radar_fallback') else 'No'}")
    lines.append(f"NDVI Mean: {sd.get('ndvi_mean', 'N/A')}")
    lines.append(f"Soil Moisture: {sd.get('soil_moisture', 'N/A')}")
    lines.append(f"Scenes: {sd.get('scenes_count', 0)}")
    lines.append(f"Cloud Cover: {sd.get('cloud_cover_pct', 'N/A')}%")
    lines.append(f"Scan Date: {sd.get('scan_date', 'N/A')}")
    lines.append("")
    ts = truth["timeseries"]
    lines.append("-" * 40)
    lines.append("TIMESERIES")
    lines.append("-" * 40)
    lines.append(f"Months: {ts.get('months', 'N/A')}")
    lines.append(f"Data Points: {ts.get('data_points', 0)}")
    if ts.get("anomalies"):
        lines.append(f"Anomalies: {len(ts['anomalies'])}")
        for a in ts["anomalies"]:
            lines.append(f"  - {a['date']}: {a['type']} ({a['severity']})")
    else:
        lines.append("Anomalies: None detected")
    lines.append("")
    hb = truth["historical_baseline"]
    lines.append("-" * 40)
    lines.append("HISTORICAL BASELINE")
    lines.append("-" * 40)
    lines.append(f"Baseline NDVI: {hb.get('baseline_ndvi_mean', 'N/A')}")
    lines.append(f"Scene Count: {hb.get('scene_count', 0)}")
    lines.append(f"Source: {hb.get('baseline_source', 'N/A')}")
    lines.append("")
    v = truth["verification"]
    lines.append("-" * 40)
    lines.append("VERIFICATION STATUS")
    lines.append("-" * 40)
    lines.append(f"Status: {v['status']}")
    lines.append(f"Recommendation: {v['recommendation']}")
    if v.get("flags"):
        lines.append("Flags:")
        for flag in v["flags"]:
            lines.append(f"  - [{flag['severity'].upper()}] {flag['message']}")
    lines.append("")
    lines.append("=" * 60)
    lines.append("END OF REPORT")
    lines.append("=" * 60)
    return "\n".join(lines)


def _verification_recommendation(status: str, crop_mix: Dict, anomalies: List) -> str:
    if status == "Verified":
        return "Satellite data confirms declared crop and location. No anomalies detected."
    if status == "Partial":
        reasons = []
        if crop_mix and not crop_mix.get("declared_crop_match"):
            reasons.append("detected crop differs from declaration")
        if anomalies:
            reasons.append("NDVI anomalies detected")
        return "Partial match: " + ", ".join(reasons) + ". Recommend field visit."
    return "Verification incomplete due to insufficient satellite data. Please retry when new imagery is available or provide coordinates manually."


def _build_flags(crop_mix: Dict, anomalies: List, radar_fallback: bool) -> List[Dict]:
    flags = []
    if crop_mix and not crop_mix.get("declared_crop_match"):
        flags.append({"severity": "warning", "message": f"Detected crop ({crop_mix.get('primary_crop')}) does not match declared crop ({crop_mix.get('declared_crop')})"})
    if crop_mix and crop_mix.get("intercropping_detected"):
        flags.append({"severity": "info", "message": "Intercropping detected — multiple vegetation signatures found"})
    if anomalies:
        for a in anomalies[:3]:
            flags.append({"severity": a.get("severity", "warning"), "message": a.get("description", "Anomaly detected")})
    if radar_fallback:
        flags.append({"severity": "info", "message": "Used Sentinel-1 SAR fallback due to cloud cover. NDVI values are approximate."})
    return flags
