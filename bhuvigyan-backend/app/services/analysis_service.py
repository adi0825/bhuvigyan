import asyncio
import json
import math
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from app.config import settings
from app.redis_client import redis_client
from app.services import land_service
from app.services.satellite_service import SatelliteService
from app.services.fraud_service import python_fallback_scorer

sat_service = SatelliteService()


def _cache_key(district: str, taluk: str, village: str, survey: str, hissa: str) -> str:
    safe = lambda s: s.replace(" ", "_").replace("/", "_")[:40]
    return f"analysis:{safe(district)}:{safe(taluk)}:{safe(village)}:{safe(survey)}:{safe(hissa)}"


def _parse_wkt_to_geojson(wkt: str) -> Optional[Dict[str, Any]]:
    import re
    match = re.search(r"POLYGON\s*\(\((.+?)\)\)\s*$", wkt, re.IGNORECASE)
    if not match:
        return None
    coords_str = match.group(1)
    rings = []
    for ring_str in coords_str.split("),("):
        pts = []
        for pair in ring_str.split(","):
            parts = pair.strip().split()
            if len(parts) >= 2:
                try:
                    lng, lat = float(parts[0]), float(parts[1])
                    pts.append([lng, lat])
                except ValueError:
                    continue
        if len(pts) >= 3:
            rings.append(pts)
    if not rings:
        return None
    return {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": rings}}


def _geojson_to_leaflet_coords(geojson: Dict[str, Any]) -> List[List[float]]:
    """Extract first ring and flip to [lat, lng]."""
    geom = geojson.get("geometry", geojson)
    coords = geom.get("coordinates", [[]])[0]
    return [[pt[1], pt[0]] for pt in coords if len(pt) >= 2]


def _compute_centroid(coords: List[List[float]]) -> tuple:
    if not coords:
        return None, None
    return (
        round(sum(c[0] for c in coords) / len(coords), 6),
        round(sum(c[1] for c in coords) / len(coords), 6),
    )


def _compute_area_ha(coords: List[List[float]]) -> float:
    if len(coords) < 3:
        return 0.0
    n, area = len(coords), 0.0
    for i in range(n):
        j = (i + 1) % n
        lat1, lng1 = coords[i]
        lat2, lng2 = coords[j]
        x1 = lng1 * 111320 * abs(math.cos(math.radians(lat1)))
        y1 = lat1 * 110540
        x2 = lng2 * 111320 * abs(math.cos(math.radians(lat2)))
        y2 = lat2 * 110540
        area += x1 * y2 - x2 * y1
    return round(abs(area) / 2.0 / 10000, 4)


def _detect_anomalies(timeseries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if len(timeseries) < 3:
        return []
    values = [t["ndvi"] for t in timeseries]
    mean = sum(values) / len(values)
    std = math.sqrt(sum((v - mean) ** 2 for v in values) / len(values)) if len(values) > 1 else 0
    threshold = 2.0 * std if std > 0 else 0.1
    for t in timeseries:
        t["is_anomaly"] = abs(t["ndvi"] - mean) > threshold
    return timeseries


def _build_polygon_response(poly_raw: Dict[str, Any], survey_number: str) -> Dict[str, Any]:
    """Normalize KGIS polygon response into unified format."""
    if not poly_raw.get("found"):
        return {"found": False, "survey_number": survey_number, "valid": False, "polygon_count": 0}

    polygons = poly_raw.get("polygons", [])
    all_coords = []
    for p in polygons:
        all_coords.extend(p)

    centroid_lat, centroid_lng = _compute_centroid(all_coords)
    area_ha = _compute_area_ha(all_coords)

    # Build GeoJSON from first polygon (extend for multipolygon later)
    geojson = None
    if polygons:
        rings = [[[pt[1], pt[0]] for pt in ring] for ring in polygons]
        geojson = {
            "type": "Feature",
            "properties": {"survey_number": survey_number},
            "geometry": {"type": "Polygon", "coordinates": rings[0:1]}
        }

    issues = []
    if not polygons:
        issues.append("No polygon geometry returned")
    if area_ha == 0:
        issues.append("Computed area is zero")

    return {
        "found": True,
        "survey_number": survey_number,
        "kgis_village_id": poly_raw.get("kgis_village_id"),
        "geojson": geojson,
        "leaflet_coords": all_coords,
        "centroid_lat": centroid_lat,
        "centroid_lng": centroid_lng,
        "area_ha_computed": area_ha,
        "polygon_count": len(polygons),
        "valid": len(issues) == 0,
        "issues": issues,
        "source": poly_raw.get("source"),
    }


async def _fetch_cached_or_compute(cache_key: str, coro, ttl: int = 21600):
    """Redis read-through helper."""
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached), True
    except Exception:
        pass
    result = await coro
    try:
        await redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
    except Exception:
        pass
    return result, False


async def run_unified_analysis(
    district: str,
    taluk: str,
    hobli: str,
    village: str,
    survey_number: str,
    hissa_number: str = "1",
    kgis_village_id: str = "",
    kgis_village_code: str = "",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    declared_crop: str = "",
    claimed_area_ha: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Orchestrate Bhoomi + KGIS + NDVI + Fraud into one unified response.
    Parallelizes independent calls where possible.
    """
    cache_key = _cache_key(district, taluk, village, survey_number, hissa_number)
    cached, is_cached = await _fetch_cached_or_compute(cache_key, _compute_analysis(
        district, taluk, hobli, village, survey_number, hissa_number,
        kgis_village_id, kgis_village_code, lat, lng, declared_crop, claimed_area_ha
    ), ttl=21600)
    if is_cached:
        cached["cached"] = True
        cached["source"] = "cache"
    return cached


async def _compute_analysis(
    district: str,
    taluk: str,
    hobli: str,
    village: str,
    survey_number: str,
    hissa_number: str,
    kgis_village_id: str,
    kgis_village_code: str,
    lat: Optional[float],
    lng: Optional[float],
    declared_crop: str,
    claimed_area_ha: Optional[float],
) -> Dict[str, Any]:
    # ── 1. Fetch Bhoomi RTC + KGIS admin in parallel ──
    rtc_task = asyncio.create_task(
        land_service.fetch_rtc(district, taluk, hobli, village, survey_number, hissa_number)
    )
    admin_task = asyncio.create_task(
        land_service.get_admin_hierarchy(kgis_village_code, "kgis") if kgis_village_code
        else land_service.get_admin_hierarchy(kgis_village_id, "kgis") if kgis_village_id
        else asyncio.sleep(0, result={"found": False})
    )

    rtc_raw, admin_raw = await asyncio.gather(rtc_task, admin_task, return_exceptions=True)
    rtc = rtc_raw if not isinstance(rtc_raw, Exception) else {"success": False, "source": "error", "message": str(rtc_raw)}
    admin = admin_raw if not isinstance(admin_raw, Exception) else {"found": False}

    # Derive kgis_village_id if missing but available from admin
    if not kgis_village_id and admin.get("kgis_village_id"):
        kgis_village_id = admin["kgis_village_id"]

    # ── 2. Fetch KGIS polygon ──
    poly_raw = {"found": False}
    if kgis_village_id:
        try:
            poly_raw = await land_service.get_survey_polygon(kgis_village_id, survey_number)
        except Exception as e:
            poly_raw = {"found": False, "error": str(e)}

    polygon = _build_polygon_response(poly_raw, survey_number)

    # Determine coordinates for NDVI
    ndvi_lat = lat or polygon.get("centroid_lat")
    ndvi_lng = lng or polygon.get("centroid_lng")

    # ── 3. Satellite analysis ──
    ndvi_data = {"mean": None, "health_label": None, "timeseries": [], "source": "unavailable"}
    if ndvi_lat and ndvi_lng:
        try:
            current = sat_service.get_ndvi_current(ndvi_lat, ndvi_lng, buffer_m=500)
            if isinstance(current, dict) and "error" not in current:
                ndvi_data = {
                    "mean": current.get("ndvi"),
                    "health_label": current.get("health_label"),
                    "interpretation": sat_service._ndvi_label(current.get("ndvi", 0)),
                    "scan_date": current.get("scan_date"),
                    "cloud_cover_pct": current.get("cloud_cover_pct"),
                    "source": current.get("source", "GEE"),
                }
            # Timeseries
            ts = sat_service.get_ndvi_timeseries(ndvi_lat, ndvi_lng, months=12, buffer_m=500)
            if isinstance(ts, list):
                ts_with_anomaly = _detect_anomalies([
                    {"date": t.get("date", ""), "ndvi": t.get("ndvi", 0), "label": t.get("label", "")}
                    for t in ts if t.get("date")
                ])
                ndvi_data["timeseries"] = ts_with_anomaly
                ndvi_data["anomaly_count"] = sum(1 for t in ts_with_anomaly if t.get("is_anomaly"))
            else:
                ndvi_data["timeseries"] = []
                ndvi_data["anomaly_count"] = 0
        except Exception as e:
            ndvi_data["error"] = str(e)
            ndvi_data["source"] = "error"

    # ── 4. Fraud scoring ──
    fraud_features = {
        "ndviAtClaim": ndvi_data.get("mean", 0.5),
        "claimedAreaHa": claimed_area_ha or rtc.get("area_hectares", 0),
        "computedAreaHa": polygon.get("area_ha_computed", 0),
        "declaredCrop": declared_crop,
        "isDuplicate": False,
        "rtcMutationDaysBefore": 999,
        "sarFloodConfirmed": False,
    }
    fraud_raw = python_fallback_scorer(fraud_features)
    fraud = {
        "fraud_score": fraud_raw.get("fraudScore", 0),
        "band": _score_to_band(fraud_raw.get("fraudScore", 0)),
        "verdict": fraud_raw.get("verdict", "UNKNOWN"),
        "recommendation": _verdict_to_recommendation(fraud_raw.get("verdict", "UNKNOWN")),
        "factors": [
            {"factor": s.get("key", ""), "severity": s.get("severity", "LOW").lower(),
             "weight": _severity_to_weight(s.get("severity", "LOW")), "detail": s.get("label", "")}
            for s in fraud_raw.get("signals", [])
        ],
    }

    # ── 5. Assemble unified response ──
    land_record = {
        "owner_name": rtc.get("owner_name"),
        "all_owners": rtc.get("all_owners"),
        "survey_number": survey_number,
        "hissa_number": hissa_number,
        "area_hectares": rtc.get("area_hectares"),
        "area_acres": rtc.get("area_acres"),
        "land_type": rtc.get("land_type"),
        "surnoc": rtc.get("surnoc"),
        "period": rtc.get("period"),
        "source": rtc.get("source", "unknown"),
        "message": rtc.get("message"),
    }

    # Track which services succeeded/failed for frontend visibility
    service_status = {
        "bhoomi": {
            "status": "success" if rtc.get("success") else "unavailable",
            "source": rtc.get("source", "unknown"),
            "message": rtc.get("message") if rtc.get("success") else "Bhoomi RTC could not be retrieved",
        },
        "kgis_polygon": {
            "status": "success" if polygon.get("found") else "unavailable",
            "source": polygon.get("source", "unknown"),
            "message": "Polygon retrieved" if polygon.get("found") else polygon.get("issues", ["No polygon data"])[0],
        },
        "kgis_admin": {
            "status": "success" if admin.get("found") else "unavailable",
            "source": admin.get("source", "unknown"),
            "message": "Admin hierarchy resolved" if admin.get("found") else "Could not resolve admin hierarchy",
        },
        "ndvi": {
            "status": "success" if ndvi_data.get("mean") is not None else "unavailable",
            "source": ndvi_data.get("source", "unknown"),
            "message": ndvi_data.get("error") or (f"NDVI mean: {ndvi_data.get('mean')}" if ndvi_data.get("mean") is not None else "NDVI not computed"),
        },
        "fraud": {
            "status": "success",
            "source": "python_fallback",
            "message": f"Fraud score: {fraud.get('fraud_score', 0)}",
        },
    }

    return {
        "success": True,
        "cached": False,
        "source": "live",
        "data": {
            "land_record": land_record,
            "polygon": polygon,
            "admin": {
                "district": admin.get("district_name") or district,
                "district_code": admin.get("district_code", ""),
                "taluk": admin.get("taluk_name") or taluk,
                "taluk_code": admin.get("taluk_code", ""),
                "hobli": admin.get("hobli_name") or hobli,
                "hobli_code": admin.get("hobli_code", ""),
                "village": admin.get("village_name") or village,
                "village_code": admin.get("village_code", ""),
                "kgis_village_id": admin.get("kgis_village_id", kgis_village_id),
                "found": admin.get("found", False),
            },
            "ndvi": ndvi_data,
            "fraud": fraud,
            "service_status": service_status,
        },
    }


def _score_to_band(score: float) -> str:
    if score <= 25:
        return "CLEAN"
    elif score <= 50:
        return "LOW_RISK"
    elif score <= 75:
        return "MEDIUM_RISK"
    return "HIGH_RISK"


def _verdict_to_recommendation(verdict: str) -> str:
    mapping = {
        "AUTO_APPROVE": "No fraud signals detected. Claim appears clean. Proceed with standard processing.",
        "OFFICER_REVIEW": "Minor anomalies detected. Recommend officer review before approval.",
        "MANDATORY_VISIT": "Significant risk factors present. Mandatory field inspection required.",
        "AUTO_REJECT_FIR": "High fraud probability. Recommend rejection and potential FIR investigation.",
    }
    return mapping.get(verdict, "Review required.")


def _severity_to_weight(severity: str) -> int:
    return {"CRITICAL": 40, "HIGH": 25, "MEDIUM": 15, "LOW": 5}.get(severity.upper(), 10)
