import datetime
import json
from typing import Dict, Any, Optional


def generate_truth_packet(
    farmer_name: Optional[str],
    survey_number: str,
    village: str,
    taluk: str,
    district: str,
    state: str,
    area_ha: Optional[float],
    crop_mix: Dict[str, Any],
    ndvi_value: Optional[float],
    soil_moisture: Optional[Dict[str, Any]],
    satellite_sources: list,
    anomalies: list,
    verification_status: str
) -> Dict[str, Any]:
    """
    Generate a downloadable one-page evidence file (truth packet)
    containing all verification evidence for a land holding.
    """
    packet = {
        "header": {
            "title": "Bhuvigyan Land Verification Report",
            "generated_at": datetime.datetime.now().isoformat(),
            "system": "Bhuvigyan Satellite Intelligence"
        },
        "farmer": {
            "name": farmer_name or "Not provided"
        },
        "land_identity": {
            "survey_number": survey_number,
            "village": village,
            "taluk": taluk,
            "district": district,
            "state": state,
            "area_hectares": area_ha
        },
        "crop_analysis": {
            "detected_crop_mix": [],
            "confidence": None,
            "intercropping": None,
            "flag": None
        },
        "satellite_data": {
            "ndvi_value_on_claim_date": ndvi_value,
            "ndvi_health_badge": _ndvi_badge(ndvi_value) if ndvi_value else None,
            "soil_moisture": None,
            "sources_used": satellite_sources,
            "anomaly_flags": anomalies
        },
        "verification": {
            "status": verification_status,
            "timestamp": datetime.datetime.now().isoformat()
        }
    }

    # Populate crop mix
    if crop_mix:
        packet["crop_analysis"]["detected_crop_mix"] = crop_mix.get("crops", [])
        packet["crop_analysis"]["confidence"] = crop_mix.get("confidence")
        packet["crop_analysis"]["intercropping"] = crop_mix.get("intercropping", False)
        packet["crop_analysis"]["flag"] = crop_mix.get("flag")

    # Populate soil moisture
    if soil_moisture:
        packet["satellite_data"]["soil_moisture"] = soil_moisture

    return packet


def truth_packet_to_text(packet: Dict[str, Any]) -> str:
    """
    Convert truth packet to a human-readable text format
    suitable for download as a .txt file.
    """
    lines = []
    lines.append("=" * 60)
    lines.append("BHUVIGYAN LAND VERIFICATION REPORT")
    lines.append("=" * 60)
    lines.append("")

    header = packet.get("header", {})
    lines.append(f"Generated: {header.get('generated_at', '—')}")
    lines.append(f"System: {header.get('system', '—')}")
    lines.append("")

    lines.append("-" * 40)
    lines.append("FARMER DETAILS")
    lines.append("-" * 40)
    farmer = packet.get("farmer", {})
    lines.append(f"Name: {farmer.get('name', '—')}")
    lines.append("")

    lines.append("-" * 40)
    lines.append("LAND IDENTITY")
    lines.append("-" * 40)
    land = packet.get("land_identity", {})
    lines.append(f"Survey Number: {land.get('survey_number', '—')}")
    lines.append(f"Village: {land.get('village', '—')}")
    lines.append(f"Taluk/Mandal: {land.get('taluk', '—')}")
    lines.append(f"District: {land.get('district', '—')}")
    lines.append(f"State: {land.get('state', '—')}")
    lines.append(f"Area: {land.get('area_hectares', '—')} hectares")
    lines.append("")

    lines.append("-" * 40)
    lines.append("CROP ANALYSIS")
    lines.append("-" * 40)
    crop = packet.get("crop_analysis", {})
    for c in crop.get("detected_crop_mix", []):
        lines.append(f"  {c.get('name', '—')}: {c.get('percentage', '—')}% ({c.get('zone', '—')})")
    lines.append(f"Confidence: {crop.get('confidence', '—')}")
    lines.append(f"Intercropping: {'Yes' if crop.get('intercropping') else 'No'}")
    if crop.get("flag"):
        lines.append(f"FLAG: {crop['flag']}")
    lines.append("")

    lines.append("-" * 40)
    lines.append("SATELLITE DATA")
    lines.append("-" * 40)
    sat = packet.get("satellite_data", {})
    lines.append(f"NDVI: {sat.get('ndvi_value_on_claim_date', '—')}")
    lines.append(f"Health: {sat.get('ndvi_health_badge', '—')}")
    if sat.get("soil_moisture"):
        sm = sat["soil_moisture"]
        lines.append(f"Soil Moisture: {sm.get('message', sm.get('available', '—'))}")
    lines.append("Sources:")
    for src in sat.get("sources_used", []):
        lines.append(f"  - {src}")
    if sat.get("anomaly_flags"):
        lines.append("Anomalies:")
        for a in sat["anomaly_flags"]:
            lines.append(f"  ! {a.get('description', a.get('type', '—'))}")
    else:
        lines.append("Anomalies: None detected")
    lines.append("")

    lines.append("-" * 40)
    lines.append("VERIFICATION")
    lines.append("-" * 40)
    ver = packet.get("verification", {})
    lines.append(f"Status: {ver.get('status', '—')}")
    lines.append(f"Timestamp: {ver.get('timestamp', '—')}")
    lines.append("")
    lines.append("=" * 60)
    lines.append("END OF REPORT")
    lines.append("=" * 60)

    return "\n".join(lines)


def _ndvi_badge(ndvi: Optional[float]) -> str:
    if ndvi is None:
        return "Unknown"
    if ndvi >= 0.6:
        return "Healthy"
    if ndvi >= 0.3:
        return "Stressed"
    return "No crop detected"
