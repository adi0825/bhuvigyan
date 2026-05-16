import httpx
import asyncio
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.logging import logger
from app.core.cache import CacheService

# Session-level cache for village geocode results
_village_cache: Dict[str, Any] = {}


async def geocode_village(village_name: str) -> Dict[str, Any]:
    """
    Bhuvan Village Geocoding API.
    API: GET https://bhuvan-app1.nrsc.gov.in/api/api_proximity/curl_village_geocode.php
    Params: village (case insensitive), token (API key)
    Headers: Content-Type: application/x-www-form-urlencoded
    Returns: False if no data, or JSON array with census 2001 village details.
    Response fields: name1, vid, no_hh, tot_p, tot_m, tot_f, p_sc, m_sc,
                     f_sc, p_st, m_st, f_st, m_lit, f_lit, dhq_name, thq_name
    Caches results for the session — does not call API more than once
    for the same village name in one session.
    """
    # Session cache check
    if village_name.lower() in _village_cache:
        return {**_village_cache[village_name.lower()], "cached": True}

    # Redis cache check
    cache_key = CacheService.make_key("bhuvan_village", village_name.lower())
    cached = await CacheService.get(cache_key)
    if cached:
        _village_cache[village_name.lower()] = cached
        return {**cached, "cached": True}

    if not settings.BHUVAN_API_KEY:
        return {
            "found": False,
            "error": "Bhuvan API key not configured",
            "village": village_name
        }

    url = (
        "https://bhuvan-app1.nrsc.gov.in/api/api_proximity/curl_village_geocode.php"
    )
    params = {
        "village": village_name,
        "token": settings.BHUVAN_API_KEY
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params, headers=headers)
            r.raise_for_status()
            data = r.json()

        # API returns False (boolean) when no data found
        if data is False or data is None:
            return {
                "found": False,
                "error": "Village not found in database. Please verify your village name or add coordinates manually.",
                "village": village_name
            }

        # API returns a list of village objects with census data
        if not isinstance(data, list) or len(data) == 0:
            return {
                "found": False,
                "error": "Village not found in database. Please verify your village name or add coordinates manually.",
                "village": village_name
            }

        # Normalize response — Bhuvan returns fields that vary by API version:
        # Some responses use: name1, dhq_name, thq_name
        # Others use: name, dist_name, tehs_name, state_name, latitude, longitude
        villages: List[Dict] = []
        for item in data:
            village_name = (
                (item.get("name1") or "").strip()
                or (item.get("name") or "").strip()
                or (item.get("village_name") or "").strip()
            )
            district = (
                (item.get("dhq_name") or "").strip()
                or (item.get("dist_name") or "").strip()
                or (item.get("district_name") or "").strip()
            )
            taluk = (
                (item.get("thq_name") or "").strip()
                or (item.get("tehs_name") or "").strip()
                or (item.get("taluk_name") or "").strip()
            )
            state = (
                (item.get("state_name") or "").strip()
                or (item.get("STATE_NAME") or "").strip()
            )
            latitude = item.get("latitude") or item.get("lat")
            longitude = item.get("longitude") or item.get("lon") or item.get("lng")

            village_obj = {
                "vid": (item.get("vid") or "").strip(),
                "village_name": village_name,
                "district": district,
                "taluk": taluk,
                "state": state,
                "latitude": float(latitude) if latitude and str(latitude).strip() not in ("", "None") else None,
                "longitude": float(longitude) if longitude and str(longitude).strip() not in ("", "None") else None,
                # Census data (optional, useful for display)
                "census": {
                    "households": item.get("no_hh"),
                    "total_population": item.get("tot_p"),
                    "male_population": item.get("tot_m"),
                    "female_population": item.get("tot_f"),
                    "sc_population": item.get("p_sc"),
                    "st_population": item.get("p_st"),
                    "male_literate": item.get("m_lit"),
                    "female_literate": item.get("f_lit"),
                }
            }
            if village_obj["village_name"]:
                villages.append(village_obj)

        if not villages:
            return {
                "found": False,
                "error": "Village not found in database. Please verify your village name or add coordinates manually.",
                "village": village_name
            }

        result = {
            "found": True,
            "villages": villages,
            "count": len(villages),
            "source": "Bhuvan NRSC Village Geocode (Census 2001)",
            "cached": False
        }

        # Cache in session + Redis
        _village_cache[village_name.lower()] = result
        await CacheService.set(cache_key, result, settings.CACHE_TTL_BHUVAN)

        return result

    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 400:
            logger.error("bhuvan_400_bad_request", village=village_name, hint="Check Content-Type header or token")
        else:
            logger.error("bhuvan_http_error", status=status, village=village_name)
        return {"found": False, "error": f"Bhuvan API returned HTTP {status}", "village": village_name}
    except httpx.ConnectError as e:
        logger.error("bhuvan_connect_error", error=str(e), village=village_name)
        return {"found": False, "error": "Cannot connect to Bhuvan API. Service may be down.", "village": village_name}
    except Exception as e:
        logger.error("bhuvan_geocode_failed", error=str(e), village=village_name)
        return {"found": False, "error": f"Bhuvan geocoding failed: {str(e)}", "village": village_name}


async def reverse_geocode(lat: float, lng: float) -> Dict[str, Any]:
    """
    Bhuvan does not support coordinate-based reverse geocoding.
    Use KGIS nearbyadminhierarchy for coordinate → village lookup.
    """
    return {
        "found": False,
        "lat": lat,
        "lng": lng,
        "error": "Bhuvan API is village-name based. Use KGIS nearbyadminhierarchy for coordinate-based lookup.",
        "cached": False
    }


async def verify_location_match(
    declared_village: str,
    declared_district: str,
    lat: float,
    lng: float
) -> Dict[str, Any]:
    """
    Compare farmer-declared village/district with Bhuvan geocoded data.
    Looks up declared village in Bhuvan, then checks district/taluk match.
    For coordinate-based verification, use KGIS nearbyadminhierarchy.
    """
    # Look up the declared village in Bhuvan
    geo_result = await geocode_village(declared_village)

    if not geo_result.get("found") or not geo_result.get("villages"):
        return {
            "verified": False,
            "match": False,
            "reason": f"Village '{declared_village}' not found in Bhuvan database. Please verify the spelling.",
            "declared_village": declared_village,
            "declared_district": declared_district
        }

    # Check if any of the returned villages match the declared district
    best_match = None
    for v in geo_result["villages"]:
        geo_district = (v.get("district") or "").lower().strip()
        dec_district = declared_district.lower().strip()

        if geo_district == dec_district or geo_district in dec_district or dec_district in geo_district:
            best_match = v
            break

    if not best_match:
        # No district match — return the first result with a mismatch warning
        best_match = geo_result["villages"][0]
        geo_district = (best_match.get("district") or "").strip()
        return {
            "verified": True,
            "match": False,
            "village_match": False,
            "district_match": False,
            "geocoded_village": best_match.get("village_name"),
            "geocoded_district": geo_district,
            "geocoded_taluk": best_match.get("taluk"),
            "declared_village": declared_village,
            "declared_district": declared_district,
            "reason": (
                f"Bhuvan shows this village in {geo_district} district, "
                f"but you entered {declared_district}. Please recheck."
            )
        }

    geo_district = (best_match.get("district") or "").strip()
    dec_district = declared_district.lower().strip()
    district_match = geo_district.lower().strip() == dec_district or geo_district.lower().strip() in dec_district

    return {
        "verified": True,
        "match": district_match,
        "village_match": True,
        "district_match": district_match,
        "geocoded_village": best_match.get("village_name"),
        "geocoded_district": geo_district,
        "geocoded_taluk": best_match.get("taluk"),
        "vid": best_match.get("vid"),
        "census": best_match.get("census"),
        "reason": (
            f"Village confirmed in Bhuvan: {best_match.get('village_name')}, "
            f"{best_match.get('taluk')}, {geo_district}"
        )
    }
