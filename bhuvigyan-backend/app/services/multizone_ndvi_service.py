import ee
import datetime
from typing import Dict, Any, List, Optional
from app.config import settings
import logging
from app.services.cache_helper import CacheService
from app.services.gee_init import initialize_gee as _init_gee

logger = logging.getLogger(__name__)

NDVI_ZONES = {
    "water_flood": (-1.0, 0.0, "Water or flooded"),
    "bare_soil": (0.0, 0.1, "Bare soil, no crop"),
    "sparse_stressed": (0.1, 0.3, "Sparse or stressed crop"),
    "growing": (0.3, 0.6, "Active growing crop"),
    "dense_healthy": (0.6, 1.0, "Dense healthy crop"),
}


def _ndvi_zone_label(ndvi: float) -> str:
    for label, (lo, hi, desc) in NDVI_ZONES.items():
        if lo <= ndvi < hi:
            return desc
    return "Unknown"


def _ndvi_health_badge(ndvi: float) -> str:
    if ndvi >= 0.6:
        return "Healthy"
    if ndvi >= 0.3:
        return "Stressed"
    return "No crop detected"


async def compute_multizone_ndvi(geojson_geometry: Dict, survey_number: str, months_back: int = 3) -> Dict[str, Any]:
    if not settings.GEE_ENABLED:
        return {"error": "GEE disabled", "zones": []}
    cache_key = CacheService.make_key("multizone_ndvi", survey_number, str(months_back))
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}
    try:
        _init_gee()
    except Exception as e:
        return {"error": str(e), "zones": []}
    try:
        region = ee.Geometry(geojson_geometry)
        today = datetime.date.today()
        start = (today - datetime.timedelta(days=months_back * 30)).isoformat()
        end = today.isoformat()

        def mask_clouds(img):
            qa = img.select("QA60")
            cloud_mask = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))
            return img.updateMask(cloud_mask).divide(10000)

        s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(region).filterDate(start, end).filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 60)).map(mask_clouds)
        count = s2.size().getInfo()
        source = "Sentinel-2 SR Harmonized"
        used_radar_fallback = False
        if count == 0:
            used_radar_fallback = True
            source = "Sentinel-1 SAR (cloud cover too high for optical)"
            return await _radar_fallback_ndvi(region, survey_number, start, end, cache_key)

        best_img = s2.sort("CLOUDY_PIXEL_PERCENTAGE").first()
        cloud_cover_pct = best_img.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()
        ndvi_img = best_img.normalizedDifference(["B8", "B4"]).rename("NDVI")
        samples = ndvi_img.sample(region=region, scale=10, numPixels=500, seed=42, geometries=True).getInfo()
        pixel_ndvis = [f["properties"]["NDVI"] for f in samples.get("features", []) if f.get("properties", {}).get("NDVI") is not None]

        if not pixel_ndvis:
            stats = ndvi_img.reduceRegion(reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), "", True), geometry=region, scale=10, maxPixels=1e8, bestEffort=True).getInfo()
            mean_val = stats.get("NDVI_mean") or stats.get("NDVI") or 0
            return {"zones": [{"zone_id": "A", "ndvi_mean": round(mean_val, 4), "label": _ndvi_zone_label(mean_val), "health_badge": _ndvi_health_badge(mean_val), "pixel_count": 1, "area_pct": 100.0}], "source": source, "cloud_cover_pct": round(cloud_cover_pct, 1), "scan_date": datetime.datetime.fromtimestamp(best_img.get("system:time_start").getInfo() / 1000).strftime("%Y-%m-%d"), "used_radar_fallback": False, "cached": False}

        zones = _cluster_ndvi_zones(pixel_ndvis)
        scan_date = datetime.datetime.fromtimestamp(best_img.get("system:time_start").getInfo() / 1000).strftime("%Y-%m-%d")
        ndvi_tile = ndvi_img.getMapId({"min": -0.2, "max": 0.8, "palette": ["#d73027", "#f46d43", "#fee08b", "#d9ef8b", "#66bd63", "#1a9850"]})["tile_fetcher"].url_format
        rgb_tile = best_img.getMapId({"bands": ["B4", "B3", "B2"], "min": 0, "max": 0.3, "gamma": 1.4})["tile_fetcher"].url_format
        result = {"zones": zones, "source": source, "cloud_cover_pct": round(cloud_cover_pct, 1), "scan_date": scan_date, "used_radar_fallback": False, "ndvi_tile_url": ndvi_tile, "rgb_tile_url": rgb_tile, "total_pixels_sampled": len(pixel_ndvis), "cached": False}
        await CacheService.set(cache_key, result, settings.CACHE_TTL_NDVI)
        return result
    except Exception as e:
        logger.error("multizone_ndvi_failed: %s", e)
        return {"error": str(e), "zones": []}


async def _radar_fallback_ndvi(region: ee.Geometry, survey_number: str, start: str, end: str, cache_key: str) -> Dict[str, Any]:
    try:
        s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(region).filterDate(start, end).filter(ee.Filter.eq("instrumentMode", "IW")).filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV")).filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
        count = s1.size().getInfo()
        if count == 0:
            return {"zones": [], "error": "No Sentinel-1 or Sentinel-2 imagery available", "source": "unavailable", "used_radar_fallback": True, "cached": False}
        best = s1.sort("system:time_start", False).first()
        vv = best.select("VV")
        vh = best.select("VH")
        ratio = vv.subtract(vh).rename("VEG_PROXY")
        stats = ratio.reduceRegion(reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), "", True), geometry=region, scale=10, maxPixels=1e8, bestEffort=True).getInfo()
        mean_proxy = stats.get("VEG_PROXY_mean") or stats.get("VEG_PROXY") or 0
        approx_ndvi = min(1.0, max(-1.0, (mean_proxy - 0) / 15.0))
        scan_date = datetime.datetime.fromtimestamp(best.get("system:time_start").getInfo() / 1000).strftime("%Y-%m-%d")
        result = {"zones": [{"zone_id": "A", "ndvi_mean": round(approx_ndvi, 4), "ndvi_source": "SAR_proxy", "label": _ndvi_zone_label(approx_ndvi), "health_badge": _ndvi_health_badge(approx_ndvi), "pixel_count": 1, "area_pct": 100.0}], "source": "Sentinel-1 SAR (optical data unavailable)", "cloud_cover_pct": 100, "scan_date": scan_date, "used_radar_fallback": True, "sar_vv_vh_ratio": round(mean_proxy, 2), "cached": False}
        await CacheService.set(cache_key, result, settings.CACHE_TTL_NDVI)
        return result
    except Exception as e:
        logger.error("radar_fallback_failed: %s", e)
        return {"error": str(e), "zones": [], "used_radar_fallback": True}


def _cluster_ndvi_zones(pixel_ndvis: List[float], max_zones: int = 4) -> List[Dict]:
    if not pixel_ndvis:
        return []
    total = len(pixel_ndvis)
    zone_definitions = [("A", 0.6, 1.0, "Dense healthy crop"), ("B", 0.3, 0.6, "Active growing crop"), ("C", 0.1, 0.3, "Sparse or stressed crop"), ("D", 0.0, 0.1, "Bare soil, no crop"), ("E", -1.0, 0.0, "Water or flooded")]
    zones = []
    for zone_id, lo, hi, label in zone_definitions:
        pixels_in_zone = [v for v in pixel_ndvis if lo <= v < hi]
        count = len(pixels_in_zone)
        if count == 0:
            continue
        mean_val = sum(pixels_in_zone) / count
        zones.append({"zone_id": zone_id, "ndvi_mean": round(mean_val, 4), "label": label, "health_badge": _ndvi_health_badge(mean_val), "pixel_count": count, "area_pct": round((count / total) * 100, 1)})
    for i, zone in enumerate(zones):
        zone["zone_id"] = chr(65 + i)
    return zones


async def compute_multizone_ndvi_timeseries(geojson_geometry: Dict, survey_number: str, months: int = 12) -> Dict[str, Any]:
    if not settings.GEE_ENABLED:
        return {"error": "GEE disabled", "timeseries": []}
    cache_key = CacheService.make_key("multizone_ts", survey_number, str(months))
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}
    try:
        _init_gee()
    except Exception as e:
        return {"error": str(e), "timeseries": []}
    try:
        region = ee.Geometry(geojson_geometry)
        today = datetime.date.today()
        start = (today - datetime.timedelta(days=months * 30)).isoformat()
        end = today.isoformat()

        def mask_and_ndvi(img):
            qa = img.select("QA60")
            cloud_mask = qa.bitwiseAnd(1 << 10).eq(0).And(qa.bitwiseAnd(1 << 11).eq(0))
            ndvi = img.updateMask(cloud_mask).divide(10000).normalizedDifference(["B8", "B4"]).rename("NDVI")
            return ndvi.set({"system:time_start": img.get("system:time_start"), "date": ee.Date(img.get("system:time_start")).format("YYYY-MM-dd")})

        s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(region).filterDate(start, end).filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40)).map(mask_and_ndvi)

        def reduce_region(img):
            stats = img.reduceRegion(reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), "", True).combine(ee.Reducer.min(), "", True).combine(ee.Reducer.max(), "", True), geometry=region, scale=10, maxPixels=1e8, bestEffort=True)
            return ee.Feature(None, {"date": img.get("date"), "ndvi_mean": stats.get("NDVI_mean"), "ndvi_std": stats.get("NDVI_stdDev"), "ndvi_min": stats.get("NDVI_min"), "ndvi_max": stats.get("NDVI_max")})

        features = s2.map(reduce_region).filter(ee.Filter.notNull(["ndvi_mean"])).getInfo()["features"]
        series = []
        for f in features:
            props = f["properties"]
            mean_val = props.get("ndvi_mean") or 0
            series.append({"date": props["date"], "ndvi_mean": round(mean_val, 4), "ndvi_std": round(props.get("ndvi_std") or 0, 4), "ndvi_min": round(props.get("ndvi_min") or 0, 4), "ndvi_max": round(props.get("ndvi_max") or 0, 4), "label": _ndvi_zone_label(mean_val)})
        series.sort(key=lambda x: x["date"])
        anomalies = _detect_anomalies(series)
        zone_lines = _build_zone_timeseries(series)
        result = {"timeseries": series, "zone_lines": zone_lines, "anomalies": anomalies, "count": len(series), "period": f"{start} to {end}", "months": months, "cached": False}
        await CacheService.set(cache_key, result, settings.CACHE_TTL_NDVI)
        return result
    except Exception as e:
        logger.error("multizone_ts_failed: %s", e)
        return {"error": str(e), "timeseries": [], "zone_lines": []}


def _build_zone_timeseries(series: List[Dict]) -> List[Dict]:
    zone_configs = [{"zone": "Dense vegetation", "min": 0.6, "max": 1.0, "color": "#16a34a"}, {"zone": "Growing crop", "min": 0.3, "max": 0.6, "color": "#84cc16"}, {"zone": "Stressed/sparse", "min": 0.1, "max": 0.3, "color": "#eab308"}, {"zone": "Bare soil", "min": 0.0, "max": 0.1, "color": "#dc2626"}]
    lines = []
    for cfg in zone_configs:
        points = [{"date": s["date"], "ndvi": s["ndvi_mean"]} for s in series if cfg["min"] <= s["ndvi_mean"] < cfg["max"]]
        if points:
            lines.append({"zone": cfg["zone"], "color": cfg["color"], "data": points})
    return lines


def _detect_anomalies(series: List[Dict]) -> List[Dict]:
    if len(series) < 3:
        return []
    anomalies = []
    ndvi_vals = [s["ndvi_mean"] for s in series]
    mean_ndvi = sum(ndvi_vals) / len(ndvi_vals)
    std_ndvi = (sum((v - mean_ndvi) ** 2 for v in ndvi_vals) / len(ndvi_vals)) ** 0.5
    for i in range(1, len(series)):
        prev = series[i - 1]["ndvi_mean"]
        curr = series[i]["ndvi_mean"]
        drop = prev - curr
        if drop > 0.30:
            anomalies.append({"date": series[i]["date"], "type": "sudden_drop", "severity": "high" if drop > 0.5 else "medium", "description": f"Anomaly on {series[i]['date']} — NDVI dropped {drop:.3f} from {prev:.3f} to {curr:.3f}", "drop_magnitude": round(drop, 4)})
        if curr < mean_ndvi - 2 * std_ndvi and curr < 0.15:
            anomalies.append({"date": series[i]["date"], "type": "abnormal_low", "severity": "medium", "description": f"NDVI {curr:.3f} is abnormally low (mean: {mean_ndvi:.3f}) on {series[i]['date']}"})
    return anomalies
