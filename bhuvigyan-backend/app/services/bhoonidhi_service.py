import httpx
import datetime
import asyncio
import logging
from typing import Optional, Dict, Any, List
from app.config import settings
from app.services.cache_helper import CacheService

logger = logging.getLogger(__name__)

_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0}


async def _get_bhoonidhi_token() -> Optional[str]:
    now = asyncio.get_event_loop().time()
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]
    redis_cached = await CacheService.get("bhoonidhi:token")
    if redis_cached and redis_cached.get("token"):
        if now < redis_cached.get("expires_at", 0):
            _token_cache["token"] = redis_cached["token"]
            _token_cache["expires_at"] = redis_cached["expires_at"]
            return redis_cached["token"]
    if not settings.BHOONIDHI_USER_ID or not settings.BHOONIDHI_PASSWORD:
        return None
    url = f"{settings.BHOONIDHI_BASE_URL}/auth/token"
    payload = {"userId": settings.BHOONIDHI_USER_ID, "password": settings.BHOONIDHI_PASSWORD}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            token = data.get("token") or data.get("access_token")
            if token:
                expires_at = now + 1100
                _token_cache["token"] = token
                _token_cache["expires_at"] = expires_at
                await CacheService.set("bhoonidhi:token", {"token": token, "expires_at": expires_at}, 1100)
                return token
    except Exception as e:
        logger.error("bhoonidhi_auth_failed: %s", e)
    return None


async def search_scenes(aoi_geojson: Dict, start_date: str, end_date: str, max_results: int = 10) -> List[Dict]:
    token = await _get_bhoonidhi_token()
    if not token:
        return []
    url = f"{settings.BHOONIDHI_BASE_URL}/stac/search"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "bbox": _geojson_to_bbox(aoi_geojson),
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "collections": ["sentinel-2-l2a", "sentinel-1-grd", "landsat-8-c2-l2"],
        "limit": max_results
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            features = data.get("features", [])
            return [{
                "id": f.get("id"),
                "collection": f.get("collection"),
                "datetime": f.get("properties", {}).get("datetime"),
                "cloud_cover": f.get("properties", {}).get("eo:cloud_cover", 100)
            } for f in features]
    except Exception as e:
        logger.error("bhoonidhi_search_failed: %s", e)
        return []


def _geojson_to_bbox(geojson: Dict) -> List[float]:
    coords = geojson.get("coordinates", [])
    if not coords:
        return []
    if geojson.get("type") == "Polygon":
        ring = coords[0]
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        return [min(lons), min(lats), max(lons), max(lats)]
    return []


async def get_soil_moisture(aoi_geojson: Dict, ndvi_mean: float = None, season: str = None) -> Optional[float]:
    """Estimate soil moisture from NDVI context and season when Bhoonidhi NISAR is unavailable.
    Returns a conservative estimate (0-100 scale) with low confidence."""
    base = 45.0  # Moderate default
    if ndvi_mean is not None:
        # Higher NDVI usually means adequate moisture
        if ndvi_mean >= 0.6:
            base = 55.0
        elif ndvi_mean >= 0.3:
            base = 42.0
        elif ndvi_mean >= 0.1:
            base = 28.0
        else:
            base = 18.0
    if season:
        s = season.lower()
        if s == "kharif":
            base += 12.0
        elif s == "rabi":
            base -= 5.0
        elif s == "zaid":
            base -= 10.0
    # Clamp to realistic range
    return round(max(10.0, min(85.0, base)), 1)


async def get_historical_baseline(aoi_geojson: Dict, years: int = 3) -> Dict[str, Any]:
    today = datetime.date.today()
    start = (today - datetime.timedelta(days=365 * years)).isoformat()
    end = today.isoformat()
    scenes = await search_scenes(aoi_geojson, start, end, max_results=50)
    if not scenes:
        return {"baseline_ndvi_mean": None, "baseline_source": "No historical scenes available"}
    return {"baseline_ndvi_mean": None, "scene_count": len(scenes), "baseline_source": "Bhoonidhi historical"}
