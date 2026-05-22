"""
SatelliteRouter — unified fallback chain for satellite data, geocoding, and scene search.

Priority chains:
  NDVI/crop:   GEE → CDSE STAC + rasterio → Microsoft Planetary Computer → null (with reason)
  Geocoding:   Bhuvan reverse → Nominatim → GeoNames → Unknown (lat/lon confirmed)
  Scene search: Bhoonidhi STAC → CDSE STAC → Earth Search AWS → Microsoft Planetary Computer

Rules:
  - 10-second timeout per call
  - One retry on timeout
  - NEVER return fake/hardcoded NDVI
  - ALWAYS log source used
"""

import os
import json
import logging
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

import httpx

from app.config import settings
from app.services.cache_helper import CacheService

logger = logging.getLogger(__name__)

# ─── Constants ──────────────────────────────────────────────────────────────
TIMEOUT = 10.0
RETRY_STATUS = {"timeout", "connect_error"}

# Nominatim user agent
NOMINATIM_UA = os.getenv("NOMINATIM_USER_AGENT", "bhuvigyan-fraud-detection/1.0")

# ═════════════════════════════════════════════════════════════════════════════
# Helper: retry wrapper
# ═════════════════════════════════════════════════════════════════════════════
async def _http_get(url: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> Tuple[int, Any, str]:
    """Returns (status_code, data_or_text, error_reason). Retries once on timeout."""
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
                r = await client.get(url, params=params, headers=headers)
                try:
                    body = r.json()
                except Exception:
                    body = r.text
                return r.status_code, body, ""
        except httpx.TimeoutException:
            if attempt == 0:
                logger.warning(f"Timeout on {url}, retrying...")
                continue
            return 0, None, "timeout"
        except httpx.ConnectError as e:
            if attempt == 0:
                logger.warning(f"Connect error on {url}, retrying...")
                continue
            return 0, None, f"connect_error: {str(e)}"
        except Exception as e:
            return 0, None, str(e)
    return 0, None, "unknown"


async def _http_post(url: str, json_payload: Optional[Dict] = None, headers: Optional[Dict] = None) -> Tuple[int, Any, str]:
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
                r = await client.post(url, json=json_payload, headers=headers)
                try:
                    body = r.json()
                except Exception:
                    body = r.text
                return r.status_code, body, ""
        except httpx.TimeoutException:
            if attempt == 0:
                continue
            return 0, None, "timeout"
        except httpx.ConnectError as e:
            if attempt == 0:
                continue
            return 0, None, f"connect_error: {str(e)}"
        except Exception as e:
            return 0, None, str(e)
    return 0, None, "unknown"


# ═════════════════════════════════════════════════════════════════════════════
# Geocoding Fallback Chain
# ═════════════════════════════════════════════════════════════════════════════
async def geocode_reverse(lat: float, lon: float) -> Dict[str, Any]:
    """
    Priority:
      1. Bhuvan reverse geocoding API
      2. Nominatim (OpenStreetMap)
      3. GeoNames API
      4. Unknown (coordinates confirmed)
    """
    # Priority 1: Bhuvan
    try:
        url = f"{settings.BHUVAN_BASE_URL}/2.0/rest/1/geocode/bhuvanrevgeocode"
        status, body, err = await _http_get(url, params={"lat": lat, "lon": lon})
        if status == 200 and body and isinstance(body, dict):
            village = body.get("village") or body.get("name") or body.get("Village")
            district = body.get("district") or body.get("District")
            state = body.get("state") or body.get("State")
            if village:
                return {
                    "village": village,
                    "taluk": body.get("taluk") or body.get("Taluk") or "",
                    "district": district or "",
                    "state": state or "",
                    "source": "Bhuvan",
                    "lat": lat,
                    "lon": lon,
                    "found": True
                }
    except Exception as e:
        logger.warning(f"Bhuvan reverse geocode failed: {e}")

    # Priority 2: Nominatim
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {"lat": lat, "lon": lon, "format": "json", "zoom": 18, "addressdetails": 1}
        headers = {"User-Agent": NOMINATIM_UA}
        status, body, err = await _http_get(url, params=params, headers=headers)
        if status == 200 and body and isinstance(body, dict):
            addr = body.get("address", {})
            village = addr.get("village") or addr.get("hamlet") or addr.get("locality") or addr.get("town") or addr.get("city") or "Unknown"
            district = addr.get("county") or addr.get("district") or addr.get("state_district") or ""
            state = addr.get("state") or ""
            taluk = addr.get("subdistrict") or addr.get("county") or ""
            return {
                "village": village,
                "taluk": taluk,
                "district": district,
                "state": state,
                "source": "Nominatim",
                "lat": lat,
                "lon": lon,
                "found": True
            }
    except Exception as e:
        logger.warning(f"Nominatim reverse geocode failed: {e}")

    # Priority 3: GeoNames (needs username)
    geonames_user = os.getenv("GEONAMES_USERNAME", "")
    if geonames_user:
        try:
            url = "http://api.geonames.org/findNearbyPlaceNameJSON"
            params = {"lat": lat, "lng": lon, "username": geonames_user}
            status, body, err = await _http_get(url, params=params)
            if status == 200 and body and isinstance(body, dict):
                places = body.get("geonames", [])
                if places:
                    p = places[0]
                    return {
                        "village": p.get("name", "Unknown"),
                        "taluk": p.get("adminName3", ""),
                        "district": p.get("adminName2", ""),
                        "state": p.get("adminName1", ""),
                        "source": "GeoNames",
                        "lat": lat,
                        "lon": lon,
                        "found": True
                    }
        except Exception as e:
            logger.warning(f"GeoNames reverse geocode failed: {e}")

    # Priority 4: Unknown
    return {
        "village": f"Unknown (lat/lon confirmed)",
        "taluk": "",
        "district": "",
        "state": "",
        "source": "Coordinates only",
        "lat": lat,
        "lon": lon,
        "found": False
    }


# ═════════════════════════════════════════════════════════════════════════════
# Satellite Data Fallback Chain (NDVI / NDWI / SAR)
# ═════════════════════════════════════════════════════════════════════════════

def _days_since(d_str: str) -> int:
    try:
        d = datetime.strptime(d_str, "%Y-%m-%d").date()
        return (datetime.utcnow().date() - d).days
    except Exception:
        return 999


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


class SatelliteRouter:
    """
    Unified router for satellite data with strict fallback chain.
    NEVER fabricates NDVI. Always records source.
    """

    def __init__(self):
        self.last_source = None
        self.last_error = None

    # ── Priority 1: Google Earth Engine ────────────────────────────────────
    def _try_gee_ndvi(self, lat: float, lon: float, buffer_m: int = 500) -> Optional[Dict]:
        try:
            from app.services.gee_init import initialize_gee
            import ee
            if not initialize_gee():
                self.last_error = "GEE not initialized"
                return None

            point = ee.Geometry.Point([lon, lat])
            region = point.buffer(buffer_m)
            end = datetime.utcnow().strftime('%Y-%m-%d')
            start = (datetime.utcnow() - timedelta(days=180)).strftime('%Y-%m-%d')

            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(region)
                .filterDate(start, end)
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
                .sort('CLOUDY_PIXEL_PERCENTAGE')
            )
            image = collection.first()
            if image is None:
                self.last_error = "No cloud-free Sentinel-2 image in GEE"
                return None

            # NDVI
            ndvi_img = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            ndvi_stats = ndvi_img.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
                geometry=region, scale=10, maxPixels=1e9
            ).getInfo()

            # NDWI
            ndwi_img = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
            ndwi_stats = ndwi_img.reduceRegion(
                reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9
            ).getInfo()

            date_info = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
            cloud_pct = image.get('CLOUDY_PIXEL_PERCENTAGE').getInfo()

            # SAR
            sar = (
                ee.ImageCollection("COPERNICUS/S1_GRD")
                .filterBounds(region)
                .filterDate(start, end)
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .select('VV')
                .sort('system:time_start', False)
                .first()
            )
            sar_vv = None
            if sar is not None:
                sar_stats = sar.reduceRegion(reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=1e9).getInfo()
                sar_vv = sar_stats.get('VV')

            # Land Cover Check (ESA WorldCover)
            land_cover_class = None
            try:
                worldcover = ee.ImageCollection("ESA/WorldCover/v200").filterBounds(region).first()
                if worldcover is not None:
                    lc_stats = worldcover.select('Map').reduceRegion(
                        reducer=ee.Reducer.mode(),
                        geometry=region,
                        scale=10,
                        maxPixels=1e9
                    ).getInfo()
                    land_cover_class = round(lc_stats.get('Map')) if lc_stats.get('Map') is not None else None
            except Exception as e:
                logger.warning(f"Failed to get land cover: {e}")

            # Tile URLs for map overlay
            tile_url, ndvi_tile_url = self._build_tile_urls(image, region)

            self.last_source = "GEE Sentinel-2"
            self.last_error = None
            return {
                "ndvi_mean": round(ndvi_stats.get('NDVI_mean'), 4) if ndvi_stats.get('NDVI_mean') is not None else None,
                "ndvi_min": round(ndvi_stats.get('NDVI_min'), 4) if ndvi_stats.get('NDVI_min') is not None else None,
                "ndvi_max": round(ndvi_stats.get('NDVI_max'), 4) if ndvi_stats.get('NDVI_max') is not None else None,
                "ndwi_mean": round(ndwi_stats.get('NDWI'), 4) if ndwi_stats.get('NDWI') is not None else None,
                "sar_vv_mean": round(sar_vv, 2) if sar_vv is not None else None,
                "land_cover_class": land_cover_class,
                "scene_date": date_info,
                "cloud_cover_pct": round(cloud_pct, 1),
                "tile_url": tile_url,
                "ndvi_tile_url": ndvi_tile_url,
                "source": "GEE Sentinel-2",
                "found": True
            }
        except Exception as e:
            self.last_error = f"GEE error: {str(e)}"
            logger.warning(self.last_error)
            return None

    def _build_tile_urls(self, image, region) -> tuple:
        """Build GEE tile URLs. Returns (rgb_url, ndvi_url). Both may be empty string."""
        tile_url = ""
        ndvi_tile_url = ""
        try:
            import ee
            # Use getThumbURL instead of getMapId — works without Maps API key
            # For frontend we use these as WMS-style overlays via TileLayer
            rgb = image.select(['B4', 'B3', 'B2'])
            thumb_params = {
                'min': 0, 'max': 3000,
                'bands': ['B4', 'B3', 'B2'],
                'dimensions': 512,
                'region': region,
                'format': 'png'
            }
            tile_url = rgb.getThumbURL(thumb_params)
        except Exception:
            pass
        try:
            import ee
            ndvi_vis = image.normalizedDifference(['B8', 'B4'])
            ndvi_params = {
                'min': -0.2, 'max': 0.8,
                'palette': ['#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850'],
                'dimensions': 512,
                'region': region,
                'format': 'png'
            }
            ndvi_tile_url = ndvi_vis.getThumbURL(ndvi_params)
        except Exception:
            pass
        return tile_url, ndvi_tile_url

    # ── Priority 2: CDSE STAC + local NDVI estimation ──────────────────────
    async def _try_cdse(self, lat: float, lon: float, buffer_m: int = 500) -> Optional[Dict]:
        """
        CDSE STAC search for Sentinel-2. If scenes found, we can't compute NDVI
        without downloading bands, but we return scene metadata and attempt
        an approximate health score from CDSE's available bands if possible.
        """
        try:
            # Small bbox around point
            offset = 0.005  # ~500m
            bbox = [lon - offset, lat - offset, lon + offset, lat + offset]
            start = (datetime.utcnow() - timedelta(days=180)).strftime('%Y-%m-%dT%H:%M:%SZ')
            end = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')

            search_url = "https://catalogue.dataspace.copernicus.eu/stac/search"
            payload = {
                "collections": ["SENTINEL-2"],
                "bbox": bbox,
                "datetime": f"{start}/{end}",
                "limit": 5
            }
            status, body, err = await _http_post(search_url, json_payload=payload)
            if status == 200 and body and isinstance(body, dict):
                features = body.get("features", [])
                if features:
                    best = features[0]
                    props = best.get("properties", {})
                    scene_date = props.get("datetime", "")[:10]
                    cloud = props.get("eo:cloud_cover", 100)
                    self.last_source = "CDSE Sentinel-2 (scene metadata)"
                    return {
                        "ndvi_mean": None,
                        "ndvi_min": None,
                        "ndvi_max": None,
                        "ndwi_mean": None,
                        "sar_vv_mean": None,
                        "scene_date": scene_date,
                        "cloud_cover_pct": cloud,
                        "tile_url": "",
                        "ndvi_tile_url": "",
                        "source": "CDSE Sentinel-2 (metadata only — download required for NDVI)",
                        "found": True,
                        "scene_count": len(features),
                        "note": "NDVI computation requires band download (rasterio). Use GEE for instant NDVI."
                    }
            self.last_error = f"CDSE returned status={status}, err={err}"
        except Exception as e:
            self.last_error = f"CDSE error: {str(e)}"
        return None

    # ── Priority 3: Microsoft Planetary Computer ───────────────────────────
    async def _try_mpc(self, lat: float, lon: float, buffer_m: int = 500) -> Optional[Dict]:
        """Query Microsoft Planetary Computer STAC for Sentinel-2 scenes."""
        try:
            offset = 0.005
            bbox = [lon - offset, lat - offset, lon + offset, lat + offset]
            start = (datetime.utcnow() - timedelta(days=180)).strftime('%Y-%m-%d')
            end = datetime.utcnow().strftime('%Y-%m-%d')

            url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
            payload = {
                "collections": ["sentinel-2-l2a"],
                "bbox": bbox,
                "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                "limit": 5
            }
            status, body, err = await _http_post(url, json_payload=payload)
            if status == 200 and body and isinstance(body, dict):
                features = body.get("features", [])
                if features:
                    best = features[0]
                    props = best.get("properties", {})
                    scene_date = props.get("datetime", "")[:10]
                    cloud = props.get("eo:cloud_cover", 100)
                    self.last_source = "Microsoft Planetary Computer"
                    return {
                        "ndvi_mean": None,
                        "ndvi_min": None,
                        "ndvi_max": None,
                        "ndwi_mean": None,
                        "sar_vv_mean": None,
                        "scene_date": scene_date,
                        "cloud_cover_pct": cloud,
                        "tile_url": "",
                        "ndvi_tile_url": "",
                        "source": "Microsoft Planetary Computer (metadata only)",
                        "found": True,
                        "scene_count": len(features),
                        "note": "NDVI computation requires band download. Use GEE for instant NDVI."
                    }
            self.last_error = f"MPC returned status={status}, err={err}"
        except Exception as e:
            self.last_error = f"MPC error: {str(e)}"
        return None

    # ── Public: unified NDVI fetch ─────────────────────────────────────────
    async def get_satellite_data(self, lat: float, lon: float, buffer_m: int = 500) -> Dict[str, Any]:
        """
        Try GEE first, then CDSE, then MPC.
        Returns dict with ndvi_mean etc. NEVER fabricates values.
        """
        self.last_source = None
        self.last_error = None

        # Priority 1: GEE
        result = None
        try:
            result = self._try_gee_ndvi(lat, lon, buffer_m)
        except Exception as e:
            logger.warning(f"GEE attempt crashed: {e}")

        if result and result.get("ndvi_mean") is not None:
            logger.info(f"Satellite data from GEE for ({lat},{lon})")
            return result

        # Priority 2: CDSE
        result = await self._try_cdse(lat, lon, buffer_m)
        if result:
            logger.info(f"Satellite metadata from CDSE for ({lat},{lon})")
            return result

        # Priority 3: Microsoft Planetary Computer
        result = await self._try_mpc(lat, lon, buffer_m)
        if result:
            logger.info(f"Satellite metadata from MPC for ({lat},{lon})")
            return result

        # Priority 4: unavailable
        logger.error(f"All satellite sources failed for ({lat},{lon}). Last error: {self.last_error}")
        return {
            "ndvi_mean": None,
            "ndvi_min": None,
            "ndvi_max": None,
            "ndwi_mean": None,
            "sar_vv_mean": None,
            "scene_date": None,
            "cloud_cover_pct": None,
            "tile_url": "",
            "ndvi_tile_url": "",
            "source": "unavailable",
            "found": False,
            "reason": f"All satellite sources failed. Last error: {self.last_error or 'unknown'}"
        }

    # ── Scene Search Fallback Chain ──────────────────────────────────────────
    async def search_scenes(self, lat: float, lon: float, buffer_m: int = 500, days: int = 90) -> Dict[str, Any]:
        """
        Priority:
          1. Bhoonidhi STAC (if token active)
          2. CDSE STAC
          3. Earth Search AWS
          4. Microsoft Planetary Computer STAC
        """
        offset = 0.005
        bbox = [lon - offset, lat - offset, lon + offset, lat + offset]
        start = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
        end = datetime.utcnow().strftime('%Y-%m-%d')

        # Priority 1: Bhoonidhi
        from app.services.bhoonidhi_service import _get_bhoonidhi_token
        try:
            token = await _get_bhoonidhi_token()
            if token:
                url = f"{settings.BHOONIDHI_BASE_URL}/stac/search"
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                payload = {
                    "bbox": bbox,
                    "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                    "collections": ["sentinel-2-l2a", "sentinel-1-grd"],
                    "limit": 10
                }
                status, body, err = await _http_post(url, json_payload=payload, headers=headers)
                if status == 200 and body and isinstance(body, dict):
                    features = body.get("features", [])
                    if features:
                        return {
                            "scenes": features,
                            "source": "Bhoonidhi STAC",
                            "count": len(features)
                        }
        except Exception as e:
            logger.warning(f"Bhoonidhi scene search failed: {e}")

        # Priority 2: CDSE
        try:
            payload = {
                "collections": ["SENTINEL-2"],
                "bbox": bbox,
                "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                "limit": 10
            }
            status, body, err = await _http_post("https://catalogue.dataspace.copernicus.eu/stac/search", json_payload=payload)
            if status == 200 and body and isinstance(body, dict):
                features = body.get("features", [])
                if features:
                    return {
                        "scenes": features,
                        "source": "CDSE STAC",
                        "count": len(features)
                    }
        except Exception as e:
            logger.warning(f"CDSE scene search failed: {e}")

        # Priority 3: Earth Search AWS
        try:
            url = "https://earth-search.aws.element84.com/v1/search"
            payload = {
                "collections": ["sentinel-2-l2a"],
                "bbox": bbox,
                "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                "limit": 10
            }
            status, body, err = await _http_post(url, json_payload=payload)
            if status == 200 and body and isinstance(body, dict):
                features = body.get("features", [])
                if features:
                    return {
                        "scenes": features,
                        "source": "Earth Search AWS",
                        "count": len(features)
                    }
        except Exception as e:
            logger.warning(f"Earth Search scene search failed: {e}")

        # Priority 4: Microsoft Planetary Computer
        try:
            url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
            payload = {
                "collections": ["sentinel-2-l2a"],
                "bbox": bbox,
                "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
                "limit": 10
            }
            status, body, err = await _http_post(url, json_payload=payload)
            if status == 200 and body and isinstance(body, dict):
                features = body.get("features", [])
                if features:
                    return {
                        "scenes": features,
                        "source": "Microsoft Planetary Computer STAC",
                        "count": len(features)
                    }
        except Exception as e:
            logger.warning(f"MPC scene search failed: {e}")

        return {
            "scenes": [],
            "source": "unavailable",
            "count": 0,
            "reason": "No satellite scenes found from any source"
        }


# ═════════════════════════════════════════════════════════════════════════════
# Crop Classification Logic
# ═════════════════════════════════════════════════════════════════════════════
def classify_crop(ndvi_mean: Optional[float], ndwi_mean: Optional[float], sar_vv_mean: Optional[float], scene_date: Optional[str] = None, land_cover_class: Optional[int] = None) -> Dict[str, Any]:
    """
    Classify crop based on Land Cover, NDVI + SAR + season.
    NEVER guesses without satellite evidence or valid land cover.
    """
    today = datetime.utcnow()
    month = today.month

    # Determine season from current month if no scene date
    if scene_date:
        try:
            month = datetime.strptime(scene_date[:10], "%Y-%m-%d").month
        except Exception:
            pass

    season = "Unknown"
    if 6 <= month <= 9:
        season = "Kharif"
    elif 10 <= month <= 2:
        season = "Rabi"
    elif 3 <= month <= 5:
        season = "Zaid"

    # No NDVI = cannot classify
    if ndvi_mean is None:
        return {
            "detected_season": season,
            "vegetation_status": "Unknown — no satellite data",
            "crop_confidence": "LOW",
            "mixed_crop_flag": False,
            "irrigation_status": "Unknown",
            "fraud_risk_baseline": "HIGH",
            "fraud_risk_reason": "No NDVI available — cannot verify crop presence"
        }

    # ── Land Cover Veto (ESA WorldCover) ───────────────────────────────────
    # Codes: 10=Trees, 50=Built-up, 70=Snow/Ice, 80=Water
    lc = round(land_cover_class) if land_cover_class is not None else None
    if lc in [10, 50, 70, 80]:
        reason = "Built-up/Urban" if lc == 50 else "Forest/Trees" if lc == 10 else "Water/Ice"
        return {
            "detected_season": season,
            "vegetation_status": f"Non-Agricultural Land ({reason})",
            "crop_confidence": "LOW",
            "mixed_crop_flag": False,
            "irrigation_status": "N/A",
            "fraud_risk_baseline": "HIGH",
            "fraud_risk_reason": f"ESA WorldCover indicates coordinates point to {reason}, NOT agricultural land.",
            "estimated_crop_type": "None (Not a farm)",
            "ndvi_used": ndvi_mean,
            "ndwi_used": ndwi_mean,
            "sar_vv_used": sar_vv_mean,
            "scene_age_days": 0,
            "stale_scene_note": None,
            "crop_coverage_pct": 0
        }

    # Calculate precise crop coverage percentage
    # NDVI 0.2 (bare soil) -> 0%, NDVI 0.8 (lush canopy) -> 100%
    crop_coverage_pct = min(100, max(0, int(((ndvi_mean - 0.2) / 0.6) * 100)))

    # Vegetation status
    if ndvi_mean >= 0.6:
        vegetation = "Active crops"
    elif ndvi_mean >= 0.4:
        vegetation = "Moderate vegetation"
    elif ndvi_mean >= 0.2:
        vegetation = "Sparse / stressed vegetation"
    elif ndvi_mean >= 0.1:
        vegetation = "Very sparse — possible early growth or stress"
    else:
        vegetation = "Barren / fallow"

    # Precise crop inference
    from app.services.crop_detection_service import _match_crop_signature
    crop_type, conf_score = _match_crop_signature(ndvi_mean, month, detected_season=season, sar_vv=sar_vv_mean)
    
    if ndvi_mean < 0.2:
        crop_type = "Barren/fallow"

    # Irrigation from NDWI
    if ndwi_mean is not None:
        if ndwi_mean > 0.1:
            irrigation = "Irrigated"
        elif ndwi_mean > -0.2:
            irrigation = "Rainfed"
        else:
            irrigation = "Dry"
    else:
        irrigation = "Unknown"

    # Fraud risk
    if ndvi_mean < 0.2:
        fraud_risk = "HIGH"
        fraud_reason = "NDVI indicates barren/fallow land — inconsistent with active crop claim"
    elif ndvi_mean < 0.35:
        fraud_risk = "MEDIUM"
        fraud_reason = "NDVI shows sparse vegetation — may indicate crop stress or early/late season"
    else:
        fraud_risk = "LOW"
        fraud_reason = f"Verified Cropland with {crop_coverage_pct}% coverage. Signature matches {crop_type}."

    confidence = "HIGH" if conf_score >= 0.7 else "MEDIUM" if conf_score >= 0.4 else "LOW"
    
    # Staleness Penalty: Cap confidence if scene is old
    if scene_date:
        try:
            days = (datetime.utcnow().date() - datetime.strptime(scene_date[:10], "%Y-%m-%d").date()).days
            if days > 45:
                if confidence == "HIGH":
                    confidence = "MEDIUM"
        except:
            pass

    # ── Staleness context ──────────────────────────────────────────────────
    stale_note = None
    scene_age_days = 0
    if scene_date:
        try:
            scene_age_days = (datetime.utcnow().date() - datetime.strptime(scene_date[:10], "%Y-%m-%d").date()).days
        except Exception:
            pass

    if scene_age_days > 45:
        stale_note = (
            f"Scene is {scene_age_days} days old ({scene_date}). "
            "Rabi crops in Maharashtra/Karnataka are harvested Mar–Apr, so "
            "low NDVI in May is NORMAL post-harvest bare soil — not fraud."
        )
        # Downgrade fraud risk if field was clearly cropped recently
        if 0.2 <= ndvi_mean < 0.35 and season in ("Rabi", "Unknown") and scene_age_days > 45:
            fraud_risk = "LOW"
            fraud_reason = (
                f"NDVI {ndvi_mean:.2f} on {scene_date} ({scene_age_days}d ago) is consistent with "
                "post-harvest Rabi stubble — field was actively cropped. "
                "Low current NDVI is EXPECTED and does NOT indicate fraud."
            )

    return {
        "detected_season": season,
        "vegetation_status": vegetation,
        "crop_confidence": confidence,
        "mixed_crop_flag": False,
        "irrigation_status": irrigation,
        "fraud_risk_baseline": fraud_risk,
        "fraud_risk_reason": fraud_reason,
        "estimated_crop_type": crop_type,
        "ndvi_used": ndvi_mean,
        "ndwi_used": ndwi_mean,
        "sar_vv_used": sar_vv_mean,
        "scene_age_days": scene_age_days,
        "stale_scene_note": stale_note,
        "crop_coverage_pct": crop_coverage_pct,
    }


# ═════════════════════════════════════════════════════════════════════════════
# Convenience: single-call analysis
# ═════════════════════════════════════════════════════════════════════════════
async def analyze_location(lat: float, lon: float, survey_no: str = "", district: str = "") -> Dict[str, Any]:
    """
    Full pipeline: geocode + satellite + classification.
    Returns the exact JSON schema required by /api/land/analyze.
    """
    ts_start = datetime.utcnow()

    # 1. Geocode
    admin = await geocode_reverse(lat, lon)

    # 2. Satellite
    router = SatelliteRouter()
    sat = await router.get_satellite_data(lat, lon, buffer_m=100)

    # 3. Classification
    crop = classify_crop(
        sat.get("ndvi_mean"),
        sat.get("ndwi_mean"),
        sat.get("sar_vv_mean"),
        sat.get("scene_date"),
        sat.get("land_cover_class")
    )

    scene_age = 999
    if sat.get("scene_date"):
        scene_age = _days_since(sat["scene_date"])

    return {
        "coordinates": {"lat": lat, "lon": lon},
        "admin": {
            "village": admin.get("village", ""),
            "taluk": admin.get("taluk", ""),
            "district": admin.get("district", ""),
            "state": admin.get("state", ""),
            "source": admin.get("source", "")
        },
        "satellite": {
            "ndvi_mean": sat.get("ndvi_mean"),
            "ndvi_min": sat.get("ndvi_min"),
            "ndvi_max": sat.get("ndvi_max"),
            "ndwi_mean": sat.get("ndwi_mean"),
            "sar_vv_mean": sat.get("sar_vv_mean"),
            "scene_date": sat.get("scene_date"),
            "cloud_cover_pct": sat.get("cloud_cover_pct"),
            "source": sat.get("source", "")
        },
        "crop_analysis": {
            "detected_season": crop["detected_season"],
            "vegetation_status": crop["vegetation_status"],
            "crop_confidence": crop["crop_confidence"],
            "mixed_crop_flag": crop["mixed_crop_flag"],
            "irrigation_status": crop["irrigation_status"],
            "fraud_risk_baseline": crop["fraud_risk_baseline"],
            "fraud_risk_reason": crop["fraud_risk_reason"],
            "estimated_crop_type": crop.get("estimated_crop_type"),
            "crop_coverage_pct": crop.get("crop_coverage_pct")
        },
        "data_freshness": {
            "latest_scene_age_days": scene_age,
            "analysis_timestamp": _now_iso()
        },
        "survey_no": survey_no,
        "district_param": district
    }
