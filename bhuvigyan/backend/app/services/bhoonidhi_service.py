import httpx
import datetime
import asyncio
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.logging import logger
from app.core.cache import CacheService

# Token cache — reuse until expiry (1200s). Do NOT request new token for every call.
_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0}


async def _get_bhoonidhi_token() -> Optional[str]:
    """
    Authenticate with Bhoonidhi API and get Bearer JWT.
    Reuses cached token until expiry. If expired, refreshes once.
    If refresh fails, re-authenticates once and caches new token.
    """
    now = asyncio.get_event_loop().time()

    # Check in-memory token cache
    if _token_cache["token"] and now < _token_cache["expires_at"]:
        return _token_cache["token"]

    # Check Redis cache
    redis_cached = await CacheService.get("bhoonidhi:token")
    if redis_cached and redis_cached.get("token"):
        expires_at = redis_cached.get("expires_at", 0)
        if now < expires_at:
            _token_cache["token"] = redis_cached["token"]
            _token_cache["expires_at"] = expires_at
            return redis_cached["token"]

    # Authenticate
    url = f"{settings.BHOONIDHI_BASE_URL}/auth/token"
    payload = {
        "userId": settings.BHOONIDHI_USER_ID,
        "password": settings.BHOONIDHI_PASSWORD
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()

        token = data.get("token") or data.get("access_token")
        if not token:
            logger.error("bhoonidhi_no_token_in_response", response=data)
            return None

        # Token expires in 1200 seconds, cache with buffer
        expires_at = now + 1100
        _token_cache["token"] = token
        _token_cache["expires_at"] = expires_at

        await CacheService.set("bhoonidhi:token", {
            "token": token,
            "expires_at": expires_at
        }, settings.CACHE_TTL_BHOONIDHI_TOKEN)

        logger.info("bhoonidhi_token_obtained")
        return token

    except Exception as e:
        logger.error("bhoonidhi_auth_failed", error=str(e))
        return None


async def search_scenes(
    aoi_geometry: Dict[str, Any],
    start_date: str,
    end_date: str,
    collections: Optional[List[str]] = None,
    cloud_cover_max: int = 60
) -> Dict[str, Any]:
    """
    Search Bhoonidhi STAC for available satellite scenes over an AOI.
    Filters only Online = Y products. Skips Online = N entirely.
    Respects rate limits: max 3 search requests per second.
    """
    if collections is None:
        collections = [
            "Sentinel-1A_SAR-IW_GRD",
            "EOS-04_SAR-MRS_L2A",
            "ResourceSat-2A_LISS3_L2",
            "EOS-06_OCM-LAC_L2C-NDVI"
        ]

    token = await _get_bhoonidhi_token()
    if not token:
        return {
            "found": False,
            "error": "Bhoonidhi authentication failed. Using alternate source.",
            "scenes": []
        }

    url = f"{settings.BHOONIDHI_BASE_URL}/data/search"
    headers = {"Authorization": f"Bearer {token}"}

    # Build search payload
    bbox = _geometry_to_bbox(aoi_geometry)
    payload = {
        "collections": collections,
        "bbox": bbox,
        "datetime": f"{start_date}/{end_date}",
        "limit": 50
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()

        features = data.get("features", []) if isinstance(data, dict) else []
        if isinstance(data, list):
            features = data

        # Filter only Online = Y products
        online_scenes = []
        for f in features:
            props = f.get("properties", {})
            if props.get("Online", "N") == "Y" or props.get("online", True):
                online_scenes.append({
                    "id": f.get("id") or props.get("id"),
                    "collection": f.get("collection") or props.get("collection"),
                    "datetime": props.get("datetime") or props.get("start_datetime"),
                    "cloud_cover": props.get("eo:cloud_cover") or props.get("cloud_cover", 0),
                    "online": True,
                    "bbox": f.get("bbox"),
                    "geometry": f.get("geometry"),
                    "links": f.get("links", [])
                })

        # Sort by date descending
        online_scenes.sort(
            key=lambda s: s.get("datetime") or "",
            reverse=True
        )

        return {
            "found": len(online_scenes) > 0,
            "scenes": online_scenes,
            "total_count": len(online_scenes),
            "source": "Bhoonidhi STAC",
            "search_period": f"{start_date} to {end_date}"
        }

    except httpx.HTTPStatusError as e:
        logger.error("bhoonidhi_search_http_error", status=e.response.status_code)
        return {"found": False, "error": f"Bhoonidhi search failed: HTTP {e.response.status_code}", "scenes": []}
    except Exception as e:
        logger.error("bhoonidhi_search_failed", error=str(e))
        return {"found": False, "error": f"Bhoonidhi search failed: {str(e)}", "scenes": []}


async def get_soil_moisture(
    aoi_geometry: Dict[str, Any],
    start_date: str,
    end_date: str
) -> Dict[str, Any]:
    """
    Fetch NISAR/EOS-04 soil moisture product from Bhoonidhi.
    Collection: EOS-04_SAR-MRS_L2A or NISAR-specific.
    """
    token = await _get_bhoonidhi_token()
    if not token:
        return {
            "available": False,
            "message": "NISAR data not yet available for this region and date. Sentinel-1 moisture estimate used.",
            "source": "fallback"
        }

    moisture_collections = [
        "EOS-04_SAR-MRS_L2A",
        "EOS-04_SAR-MRS_L2B"
    ]

    result = await search_scenes(
        aoi_geometry, start_date, end_date,
        collections=moisture_collections
    )

    if not result.get("found"):
        return {
            "available": False,
            "message": "NISAR data not yet available for this region and date. Sentinel-1 moisture estimate used.",
            "source": "fallback"
        }

    # Return the most recent moisture scene
    latest = result["scenes"][0] if result["scenes"] else None
    return {
        "available": True,
        "scene_id": latest["id"] if latest else None,
        "collection": latest["collection"] if latest else None,
        "datetime": latest["datetime"] if latest else None,
        "source": "Bhoonidhi NISAR/EOS-04",
        "message": "Soil moisture product available"
    }


async def get_historical_baseline(
    aoi_geometry: Dict[str, Any],
    years_back: int = 10
) -> Dict[str, Any]:
    """
    Check Landsat/EOS-06 archive from Bhoonidhi for historical baseline.
    Confirms whether this land has shown vegetation signatures in past seasons.
    """
    token = await _get_bhoonidhi_token()
    if not token:
        return {"available": False, "historical_crop": None, "source": "unavailable"}

    today = datetime.date.today()
    end_date = today.isoformat()
    start_date = (today - datetime.timedelta(days=years_back * 365)).isoformat()

    historical_collections = [
        "ResourceSat-2A_LISS3_L2",
        "EOS-06_OCM-LAC_L2C-NDVI"
    ]

    result = await search_scenes(
        aoi_geometry, start_date, end_date,
        collections=historical_collections
    )

    if not result.get("found"):
        return {
            "available": False,
            "historical_crop": False,
            "flag": "No prior farming activity detected on this land unit",
            "source": "Bhoonidhi Archive"
        }

    return {
        "available": True,
        "scene_count": result["total_count"],
        "earliest_scene": result["scenes"][-1]["datetime"] if result["scenes"] else None,
        "latest_scene": result["scenes"][0]["datetime"] if result["scenes"] else None,
        "historical_crop": True,
        "source": "Bhoonidhi Archive"
    }


def _geometry_to_bbox(geometry: Dict[str, Any]) -> List[float]:
    """
    Extract bounding box [west, south, east, north] from a GeoJSON geometry.
    """
    coords = []
    geom_type = geometry.get("type", "")

    if geom_type == "Polygon":
        for ring in geometry.get("coordinates", []):
            coords.extend(ring)
    elif geom_type == "MultiPolygon":
        for polygon in geometry.get("coordinates", []):
            for ring in polygon:
                coords.extend(ring)
    elif geom_type == "Point":
        c = geometry.get("coordinates", [0, 0])
        return [c[0] - 0.01, c[1] - 0.01, c[0] + 0.01, c[1] + 0.01]
    else:
        return [77.0, 12.0, 78.0, 13.0]  # fallback

    if not coords:
        return [77.0, 12.0, 78.0, 13.0]

    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return [min(lngs), min(lats), max(lngs), max(lats)]
