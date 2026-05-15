import ee
import json
import datetime
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.logging import logger

_initialized = False


def _init_gee():
    global _initialized
    if _initialized:
        return
    try:
        credentials = ee.ServiceAccountCredentials(
            email=None,
            key_file=settings.GEE_SERVICE_ACCOUNT_KEY
        )
        ee.Initialize(
            credentials,
            project=settings.GEE_PROJECT_ID
        )
        _initialized = True
        logger.info("gee_initialized")
    except Exception as e:
        logger.error("gee_init_failed", error=str(e))
        raise RuntimeError(f"GEE init failed: {e}")


def _geojson_to_ee(geojson: Dict) -> ee.Geometry:
    """Convert GeoJSON geometry dict → ee.Geometry"""
    return ee.Geometry(geojson)


def _polygon_to_ee(leaflet_coords: List) -> ee.Geometry:
    """
    Convert Leaflet [[lat,lng]] → ee.Geometry.Polygon
    GEE needs [[lng,lat]] format
    """
    # Flip from [lat,lng] to [lng,lat]
    ee_coords = [[coord[1], coord[0]]
                 for coord in leaflet_coords]
    return ee.Geometry.Polygon([ee_coords])
