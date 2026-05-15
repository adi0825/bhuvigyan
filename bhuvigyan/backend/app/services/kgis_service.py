import httpx
import ssl
import asyncio
from typing import Optional, Dict, Any, List
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type
)
from app.core.config import settings
from app.core.logging import logger
from app.core.cache import CacheService
from app.geo.parser import GeometryParser
from app.geo.validator import GeometryValidator


# KGIS uses self-signed SSL — bypass verification
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

KGIS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; Bhuvigyan/1.0)"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9"
}

# All known KGIS base URL variants
KGIS_BASES = [
    settings.KGIS_BASE_URL,
    "http://kgis.ksrsac.in:9000/genericwebservices/ws",
    "https://kgis.ksrsac.in/genericwebservices/ws",
    "http://kgis.ksrsac.in/genericwebservices/ws",
]


async def _kgis_get(
    path: str,
    params: Dict,
    client: httpx.AsyncClient
) -> Optional[Any]:
    """Try all KGIS base URLs, return first success"""
    last_error = None
    for base in KGIS_BASES:
        url = f"{base}/{path}"
        try:
            r = await client.get(
                url, params=params,
                timeout=settings.KGIS_TIMEOUT
            )
            r.raise_for_status()
            data = r.json()
            logger.info("kgis_success",
                        url=url, path=path)
            return data
        except httpx.ConnectError as e:
            last_error = f"ConnectError: {e}"
            logger.warning("kgis_connect_error",
                           url=url, error=str(e))
        except httpx.TimeoutException:
            last_error = "Timeout"
            logger.warning("kgis_timeout", url=url)
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}"
            logger.warning("kgis_http_error",
                           url=url,
                           status=e.response.status_code)
        except Exception as e:
            last_error = str(e)
            logger.warning("kgis_error",
                           url=url, error=str(e))

    logger.error("kgis_all_bases_failed",
                 path=path, last_error=last_error)
    return None


async def get_admin_hierarchy(
    village_code: str,
    code_type: str = "lgd"
) -> Dict[str, Any]:
    """
    API 1: kgisadminhierarchy
    Returns district/taluk/hobli/village names
    from any village code type (lgd/kgis/bhoomi)
    """
    cache_key = CacheService.make_key(
        "admin_hier", village_code, code_type
    )
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    params = {
        "deptcode": "01",
        "applncode": "0102",
        "code": village_code,
        "type": code_type
    }

    async with httpx.AsyncClient(
        verify=SSL_CTX, headers=KGIS_HEADERS
    ) as client:
        data = await _kgis_get(
            "kgisadminhierarchy", params, client
        )

    if not data or not isinstance(data, list):
        return {
            "found": False,
            "error": "No data from KGIS hierarchy API",
            "village_code": village_code
        }

    item = data[0]
    if item.get("message") != "Data Available":
        return {
            "found": False,
            "error": item.get("message", "No data"),
            "village_code": village_code
        }

    result = {
        "found": True,
        "district_name": item.get("districtName"),
        "district_code": item.get("districtCode"),
        "taluk_name": item.get("talukName"),
        "taluk_code": item.get("talukCode"),
        "hobli_name": item.get("hobliName"),
        "hobli_code": item.get("hobliCode"),
        "village_name": item.get("villageName"),
        "village_code": item.get("villageCode"),
        "source": "KGIS KSRSAC",
        "cached": False
    }

    await CacheService.set(
        cache_key, result, settings.CACHE_TTL_POLYGON
    )
    return result


async def get_survey_numbers(
    village_code: str,
    lat: float,
    lng: float,
    distance: int = 500
) -> Dict[str, Any]:
    """
    API 2: surveyno
    Returns survey numbers near GPS coordinates
    within a village
    """
    params = {
        "villagecode": village_code,
        "coordinates": f"{lat},{lng}",
        "type": "DD",
        "distance": str(distance)
    }

    async with httpx.AsyncClient(
        verify=SSL_CTX, headers=KGIS_HEADERS
    ) as client:
        data = await _kgis_get("surveyno", params, client)

    if not data:
        return {
            "found": False,
            "error": "Survey numbers API failed"
        }

    admin = (data.get("adminhierarchy") or [{}])[0]
    raw_surveys = data.get("surveynumber", [])

    # Clean: remove roads, streams, duplicates
    EXCLUDE = {
        "ROAD", "STREAM", "SETTLEMENT",
        "WATER BODY", "LAKE", "TANK"
    }
    seen = set()
    clean_surveys = []
    for s in raw_surveys:
        sno = s.get("sno", "")
        if (sno and sno not in EXCLUDE and
                not any(ex in sno for ex in EXCLUDE) and
                sno not in seen):
            seen.add(sno)
            clean_surveys.append(sno)

    return {
        "found": True,
        "admin_hierarchy": {
            "district": admin.get("districtName"),
            "taluk": admin.get("talukName"),
            "hobli": admin.get("hobliName"),
            "village": admin.get("villageName")
        },
        "survey_numbers": clean_surveys,
        "total_count": len(clean_surveys),
        "source": "KGIS KSRSAC"
    }


async def get_survey_polygon(
    kgis_village_id: str,
    survey_number: str,
    coord_type: str = "DD"
) -> Dict[str, Any]:
    """
    API 3: geomForSurveyNum
    Returns exact WKT polygon for a survey number.
    Tries multiple URL path variants.
    Parses and validates the geometry.
    """
    cache_key = CacheService.make_key(
        "polygon", kgis_village_id,
        survey_number, coord_type
    )
    cached = await CacheService.get(cache_key)
    if cached:
        return {**cached, "cached": True}

    # Multiple path formats to try
    paths_to_try = [
        f"geomForSurveyNum/{kgis_village_id}"
        f"/{survey_number}/{coord_type}",
        f"geomForSurveyNum/{kgis_village_id}"
        f"/{survey_number}/{coord_type.lower()}",
        (f"geomForSurveyNum/"
         f"?villageid={kgis_village_id}"
         f"&surveyno={survey_number}&type={coord_type}"),
    ]

    raw_data = None
    async with httpx.AsyncClient(
        verify=SSL_CTX, headers=KGIS_HEADERS
    ) as client:
        for path in paths_to_try:
            # Try across all base URLs
            for base in KGIS_BASES:
                url = f"{base}/{path}"
                try:
                    r = await client.get(
                        url,
                        timeout=settings.KGIS_TIMEOUT
                    )
                    r.raise_for_status()
                    data = r.json()
                    if (data and isinstance(data, list) and
                            data[0].get("message") == "200"):
                        raw_data = data
                        logger.info(
                            "polygon_fetch_success",
                            url=url,
                            survey=survey_number
                        )
                        break
                except Exception as e:
                    logger.debug(
                        "polygon_attempt_failed",
                        url=url, error=str(e)
                    )
            if raw_data:
                break

    if not raw_data:
        return {
            "found": False,
            "error": (
                "Polygon API unavailable — "
                "port 9000 may be blocked. "
                "Use GPS pin instead."
            ),
            "kgis_village_id": kgis_village_id,
            "survey_number": survey_number
        }

    # Parse all polygon features
    geo_result = GeometryParser.extract_all_polygons(
        raw_data
    )

    if not geo_result["found"]:
        return {
            "found": False,
            "error": "No valid geometry in response"
        }

    # Validate
    validation = GeometryValidator.validate_polygon(
        geo_result
    )

    result = {
        **geo_result,
        "survey_number": survey_number,
        "kgis_village_id": kgis_village_id,
        "validation": validation,
        "raw_count": len(raw_data),
        "source": "KGIS KSRSAC geomForSurveyNum",
        "cached": False
    }

    if geo_result["found"]:
        await CacheService.set(
            cache_key, result,
            settings.CACHE_TTL_POLYGON
        )

    return result


async def get_nearby_admin(
    lat: float,
    lng: float,
    distance: int = 5000,
    aoi: str = "d,t,h"
) -> Dict[str, Any]:
    """
    API 4: nearbyadminhierarchy
    Reverse geocode GPS → district/taluk/hobli
    """
    params = {
        "coordinates": f"{lat},{lng}",
        "distance": str(distance),
        "type": "DD",
        "aoi": aoi
    }

    async with httpx.AsyncClient(
        verify=SSL_CTX, headers=KGIS_HEADERS
    ) as client:
        data = await _kgis_get(
            "nearbyadminhierarchy", params, client
        )

    if not data or not isinstance(data, list):
        return {
            "found": False,
            "lat": lat, "lng": lng
        }

    result = {
        "found": True,
        "source": "KGIS KSRSAC"
    }
    for item in data:
        if "districtName" in item:
            result["district"] = item["districtName"]
            result["district_code"] = item.get(
                "districtCode"
            )
        if "talukName" in item:
            result["taluk"] = item["talukName"]
            result["taluk_code"] = item.get(
                "talukCode"
            )
        if "hobliName" in item:
            result["hobli"] = item["hobliName"]
            result["hobli_code"] = item.get(
                "hobliCode"
            )

    return result
