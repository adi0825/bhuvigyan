import ee
import json
import datetime
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.core.cache import CacheService
from app.services.gee_service import _init_gee


def _ndvi_label(ndvi: float) -> str:
    if ndvi < 0.0:
        return "Non-vegetated / Water"
    if ndvi < 0.15:
        return "Bare soil / No vegetation"
    if ndvi < 0.30:
        return "Sparse vegetation / Stressed crop"
    if ndvi < 0.45:
        return "Moderate vegetation"
    if ndvi < 0.65:
        return "Healthy crop"
    return "Dense vegetation"


def _ndwi_label(ndwi: float) -> str:
    if ndwi > 0.3:
        return "High water content / Flood risk"
    if ndwi > 0.0:
        return "Moderate moisture"
    if ndwi > -0.3:
        return "Low moisture / Dry"
    return "Very dry / Drought stress"


def _build_ee_polygon(geojson_geometry: Dict) -> ee.Geometry:
    """Build ee.Geometry from GeoJSON geometry dict"""
    return ee.Geometry(geojson_geometry)


async def compute_ndvi_for_polygon(
    geojson_geometry: Dict,
    survey_number: str,
    months_back: int = 1
) -> Dict[str, Any]:
    """
    Compute NDVI using the EXACT survey polygon.
    This is polygon-based, not point-based.
    Uses Sentinel-2 SR Harmonized collection.
    """
    if not settings.GEE_ENABLED:
        return {"error": "GEE disabled", "ndvi": None}

    cache_key = CacheService.make_key(
        "ndvi", survey_number, str(months_back)
    )
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        _init_gee()
    except Exception as e:
        return {"error": str(e), "ndvi": None}

    try:
        region = _build_ee_polygon(geojson_geometry)
        today = datetime.date.today()
        start = (
            today - datetime.timedelta(days=months_back * 30)
        ).isoformat()
        end = today.isoformat()

        # Sentinel-2 SR with cloud masking
        def mask_clouds(img):
            qa = img.select("QA60")
            cloud_mask = qa.bitwiseAnd(1 << 10).eq(0).And(
                qa.bitwiseAnd(1 << 11).eq(0)
            )
            return img.updateMask(cloud_mask).divide(10000)

        s2 = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(region)
            .filterDate(start, end)
            .filter(ee.Filter.lt(
                "CLOUDY_PIXEL_PERCENTAGE", 30
            ))
            .map(mask_clouds)
        )

        count = s2.size().getInfo()
        if count == 0:
            # Fallback: relax cloud filter
            s2 = (
                ee.ImageCollection(
                    "COPERNICUS/S2_SR_HARMONIZED"
                )
                .filterBounds(region)
                .filterDate(start, end)
                .filter(ee.Filter.lt(
                    "CLOUDY_PIXEL_PERCENTAGE", 60
                ))
                .map(mask_clouds)
            )
            count = s2.size().getInfo()

        if count == 0:
            return {
                "error": "No cloud-free imagery available",
                "ndvi": None,
                "period": f"{start} to {end}"
            }

        # Best image (least cloud cover)
        best_img = (s2.sort("CLOUDY_PIXEL_PERCENTAGE")
                    .first())

        # Compute NDVI = (B8 - B4) / (B8 + B4)
        ndvi_img = best_img.normalizedDifference(
            ["B8", "B4"]
        ).rename("NDVI")

        # Compute NDWI = (B3 - B8) / (B3 + B8)
        ndwi_img = best_img.normalizedDifference(
            ["B3", "B8"]
        ).rename("NDWI")

        # Reduce over polygon (mean + std dev + min + max)
        ndvi_stats = ndvi_img.reduceRegion(
            reducer=ee.Reducer.mean()
                    .combine(ee.Reducer.stdDev(), "",
                             True)
                    .combine(ee.Reducer.min(), "", True)
                    .combine(ee.Reducer.max(), "", True),
            geometry=region,
            scale=10,
            maxPixels=1e8,
            bestEffort=True
        ).getInfo()

        ndwi_stats = ndwi_img.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=10,
            maxPixels=1e8,
            bestEffort=True
        ).getInfo()

        ndvi_mean = ndvi_stats.get("NDVI_mean") or \
                    ndvi_stats.get("NDVI")
        ndvi_std  = ndvi_stats.get("NDVI_stdDev", 0)
        ndvi_min  = ndvi_stats.get("NDVI_min", 0)
        ndvi_max  = ndvi_stats.get("NDVI_max", 0)
        ndwi_mean = ndwi_stats.get("NDWI_mean") or \
                    ndwi_stats.get("NDWI")

        scan_date = datetime.datetime.fromtimestamp(
            best_img.get("system:time_start").getInfo()
            / 1000
        ).strftime("%Y-%m-%d")

        cloud_pct = best_img.get(
            "CLOUDY_PIXEL_PERCENTAGE"
        ).getInfo()

        # Tile URLs for map overlay
        ndvi_tile = ndvi_img.getMapId({
            "min": -0.2, "max": 0.8,
            "palette": [
                "#d73027", "#f46d43", "#fdae61",
                "#fee08b", "#d9ef8b", "#a6d96a",
                "#66bd63", "#1a9850"
            ]
        })["tile_fetcher"].url_format

        rgb_tile = best_img.getMapId({
            "bands": ["B4", "B3", "B2"],
            "min": 0, "max": 0.3, "gamma": 1.4
        })["tile_fetcher"].url_format

        result = {
            "ndvi": {
                "mean": round(ndvi_mean or 0, 4),
                "std_dev": round(ndvi_std or 0, 4),
                "min": round(ndvi_min or 0, 4),
                "max": round(ndvi_max or 0, 4),
                "label": _ndvi_label(ndvi_mean or 0),
                "health_pct": round(
                    max(0, min(100,
                        (ndvi_mean or 0) * 100)), 1
                )
            },
            "ndwi": {
                "mean": round(ndwi_mean or 0, 4),
                "label": _ndwi_label(ndwi_mean or 0)
            },
            "imagery": {
                "scan_date": scan_date,
                "cloud_cover_pct": round(cloud_pct, 1),
                "image_count": count,
                "source": "Sentinel-2 SR Harmonized",
                "ndvi_tile_url": ndvi_tile,
                "rgb_tile_url": rgb_tile
            },
            "period": f"{start} to {end}",
            "cached": False
        }

        await CacheService.set(
            cache_key, result, settings.CACHE_TTL_NDVI
        )
        return result

    except Exception as e:
        logger.error("ndvi_compute_failed",
                     survey=survey_number, error=str(e))
        return {
            "error": str(e),
            "ndvi": None,
            "survey_number": survey_number
        }


async def compute_ndvi_timeseries(
    geojson_geometry: Dict,
    survey_number: str,
    months: int = 12
) -> Dict[str, Any]:
    """
    NDVI time series over the polygon.
    One value per cloud-free Sentinel-2 image.
    Used for temporal anomaly detection.
    """
    if not settings.GEE_ENABLED:
        return {"error": "GEE disabled",
                "timeseries": []}

    cache_key = CacheService.make_key(
        "ndvi_ts", survey_number, str(months)
    )
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        _init_gee()
    except Exception as e:
        return {"error": str(e), "timeseries": []}

    try:
        region = _build_ee_polygon(geojson_geometry)
        today = datetime.date.today()
        start = (
            today - datetime.timedelta(days=months * 30)
        ).isoformat()
        end = today.isoformat()

        def mask_and_ndvi(img):
            qa = img.select("QA60")
            cloud_mask = qa.bitwiseAnd(1 << 10).eq(0).And(
                qa.bitwiseAnd(1 << 11).eq(0)
            )
            ndvi = img.updateMask(cloud_mask).divide(
                10000
            ).normalizedDifference(
                ["B8", "B4"]
            ).rename("NDVI")
            return ndvi.set({
                "system:time_start":
                    img.get("system:time_start"),
                "date": ee.Date(
                    img.get("system:time_start")
                ).format("YYYY-MM-dd")
            })

        s2 = (
            ee.ImageCollection(
                "COPERNICUS/S2_SR_HARMONIZED"
            )
            .filterBounds(region)
            .filterDate(start, end)
            .filter(ee.Filter.lt(
                "CLOUDY_PIXEL_PERCENTAGE", 40
            ))
            .map(mask_and_ndvi)
        )

        def reduce_region(img):
            stats = img.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=10,
                maxPixels=1e8,
                bestEffort=True
            )
            return ee.Feature(None, {
                "date": img.get("date"),
                "ndvi": stats.get("NDVI")
            })

        features = (
            s2.map(reduce_region)
            .filter(ee.Filter.notNull(["ndvi"]))
            .getInfo()["features"]
        )

        series = []
        for f in features:
            props = f["properties"]
            ndvi_val = props.get("ndvi") or 0
            series.append({
                "date": props["date"],
                "ndvi": round(ndvi_val, 4),
                "label": _ndvi_label(ndvi_val)
            })

        series.sort(key=lambda x: x["date"])

        # Detect anomalies in series
        anomalies = _detect_anomalies(series)

        result = {
            "timeseries": series,
            "count": len(series),
            "anomalies": anomalies,
            "period": f"{start} to {end}",
            "months": months,
            "cached": False
        }

        await CacheService.set(
            cache_key, result, settings.CACHE_TTL_NDVI
        )
        return result

    except Exception as e:
        logger.error("timeseries_failed",
                     survey=survey_number, error=str(e))
        return {
            "error": str(e),
            "timeseries": [],
            "survey_number": survey_number
        }


def _detect_anomalies(
    series: List[Dict]
) -> List[Dict]:
    """
    Detect temporal NDVI anomalies:
    - Sudden drops (crop failure / fraud)
    - Abnormally low NDVI during growing season
    - Inconsistent patterns
    """
    if len(series) < 3:
        return []

    anomalies = []
    ndvi_vals = [s["ndvi"] for s in series]
    mean_ndvi = sum(ndvi_vals) / len(ndvi_vals)
    std_ndvi = (
        sum((v - mean_ndvi) ** 2 for v in ndvi_vals)
        / len(ndvi_vals)
    ) ** 0.5

    for i in range(1, len(series)):
        prev = series[i - 1]["ndvi"]
        curr = series[i]["ndvi"]
        drop = prev - curr

        # Sudden drop > 0.3 in one period
        if drop > 0.30:
            anomalies.append({
                "date": series[i]["date"],
                "type": "sudden_drop",
                "severity": "high" if drop > 0.5 else "medium",
                "description": (
                    f"NDVI dropped {drop:.3f} from "
                    f"{prev:.3f} to {curr:.3f}"
                ),
                "drop_magnitude": round(drop, 4)
            })

        # Below 2 std devs
        if curr < mean_ndvi - 2 * std_ndvi and curr < 0.15:
            anomalies.append({
                "date": series[i]["date"],
                "type": "abnormal_low",
                "severity": "medium",
                "description": (
                    f"NDVI {curr:.3f} is abnormally low "
                    f"(mean: {mean_ndvi:.3f})"
                )
            })

    return anomalies
