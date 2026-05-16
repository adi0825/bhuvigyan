import httpx
import logging
from typing import Dict, Any, List
from app.config import settings
from app.services.cache_helper import CacheService

logger = logging.getLogger(__name__)

_village_cache: Dict[str, Any] = {}


async def geocode_village(village_name: str) -> Dict[str, Any]:
    if village_name.lower() in _village_cache:
        return {**_village_cache[village_name.lower()], "cached": True}

    cache_key = CacheService.make_key("bhuvan_village", village_name.lower())
    cached = await CacheService.get(cache_key)
    if cached:
        _village_cache[village_name.lower()] = cached
        return {**cached, "cached": True}

    if not settings.BHUVAN_API_KEY:
        return {"found": False, "error": "Bhuvan API key not configured", "village": village_name}

    url = "https://bhuvan-app1.nrsc.gov.in/api/api_proximity/curl_village_geocode.php"
    params = {"village": village_name, "token": settings.BHUVAN_API_KEY}
    headers = {"Content-Type": "application/x-www-form-urlencoded"}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(url, params=params, headers=headers)
            r.raise_for_status()
            text = r.text.strip()
            # Bhuvan sometimes returns empty body or HTML error page
            if not text or text == "" or text.lower() == "false":
                return {"found": False, "error": "Village not found in database.", "village": village_name}
            data = r.json()

        if data is False or data is None:
            return {"found": False, "error": "Village not found in database.", "village": village_name}

        if not isinstance(data, list) or len(data) == 0:
            return {"found": False, "error": "Village not found in database.", "village": village_name}

        villages: List[Dict] = []
        for item in data:
            v_name = ((item.get("name1") or "").strip() or (item.get("name") or "").strip() or (item.get("village_name") or "").strip())
            district = ((item.get("dhq_name") or "").strip() or (item.get("dist_name") or "").strip() or (item.get("district_name") or "").strip())
            taluk = ((item.get("thq_name") or "").strip() or (item.get("tehs_name") or "").strip() or (item.get("taluk_name") or "").strip())
            state = ((item.get("state_name") or "").strip() or (item.get("STATE_NAME") or "").strip())
            lat = item.get("latitude") or item.get("lat")
            lng = item.get("longitude") or item.get("lon") or item.get("lng")

            village_obj = {
                "vid": (item.get("vid") or "").strip(),
                "village_name": v_name,
                "district": district,
                "taluk": taluk,
                "state": state,
                "latitude": float(lat) if lat and str(lat).strip() not in ("", "None") else None,
                "longitude": float(lng) if lng and str(lng).strip() not in ("", "None") else None,
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
            return {"found": False, "error": "Village not found.", "village": village_name}

        result = {"found": True, "villages": villages, "count": len(villages), "source": "Bhuvan NRSC", "cached": False}
        _village_cache[village_name.lower()] = result
        await CacheService.set(cache_key, result, settings.CACHE_TTL_BHUVAN)
        return result

    except httpx.HTTPStatusError as e:
        logger.error("bhuvan_http_error: %s for village %s", e.response.status_code, village_name)
        return {"found": False, "error": f"Bhuvan API HTTP {e.response.status_code}", "village": village_name}
    except Exception as e:
        logger.error("bhuvan_geocode_failed: %s for village %s", e, village_name)
        return {"found": False, "error": f"Bhuvan failed: {str(e)}", "village": village_name}


async def verify_location_match(declared_village: str, declared_district: str, lat: float, lng: float) -> Dict[str, Any]:
    geo_result = await geocode_village(declared_village)
    if not geo_result.get("found") or not geo_result.get("villages"):
        return {"verified": False, "match": False, "reason": f"Village '{declared_village}' not found.", "declared_village": declared_village, "declared_district": declared_district}

    best_match = None
    for v in geo_result["villages"]:
        gd = (v.get("district") or "").lower().strip()
        dd = declared_district.lower().strip()
        if gd == dd or gd in dd or dd in gd:
            best_match = v
            break

    if not best_match:
        best_match = geo_result["villages"][0]
        gd = (best_match.get("district") or "").strip()
        return {"verified": True, "match": False, "village_match": False, "district_match": False,
                "geocoded_village": best_match.get("village_name"), "geocoded_district": gd,
                "geocoded_taluk": best_match.get("taluk"), "declared_village": declared_village,
                "declared_district": declared_district,
                "reason": f"Bhuvan shows this village in {gd}, but you entered {declared_district}. Please recheck."}

    gd = (best_match.get("district") or "").strip()
    dd = declared_district.lower().strip()
    district_match = gd.lower().strip() == dd or gd.lower().strip() in dd
    return {"verified": True, "match": district_match, "village_match": True, "district_match": district_match,
            "geocoded_village": best_match.get("village_name"), "geocoded_district": gd,
            "geocoded_taluk": best_match.get("taluk"), "vid": best_match.get("vid"), "census": best_match.get("census"),
            "reason": f"Village confirmed: {best_match.get('village_name')}, {best_match.get('taluk')}, {gd}"}
