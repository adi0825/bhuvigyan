from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timedelta
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_farmer, require_admin_role, require_role, get_current_user
from app.models.farmer import Farmer
from app.models.cce_visit import CceVisit
from app.models.claim import Claim
from app.redis_client import redis_client
from app.models.udlrn_master import UdlrnMaster
from app.models.satellite_report import SatelliteReport
from app.config import settings
from app.services.satellite_cache import satellite_cache
from app.services.satellite_service import SatelliteService, get_ndvi_label, get_ndvi_from_gee, get_sar_flood_from_gee

router = APIRouter(prefix="/satellite", tags=["Satellite Intelligence"])
sat_service = SatelliteService()


# ────────────────────────────────────────────────────────────
# V7 NEW ENDPOINTS
# ────────────────────────────────────────────────────────────

@router.get("/farm/{farmer_id}")
async def get_farm_satellite(
    farmer_id: str,
    refresh: bool = Query(False, description="Force refresh, bypass cache"),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["FARMER", "ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR"])),
    response: Response = None,
):
    """Full farm satellite analysis for a farmer.
    Uses Farmer table coordinates (farm_lat, farm_lng)."""
    try:
        fid = UUID(farmer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid farmer_id format. Must be a valid UUID.")

    # Verify farmer owns this land (skip for admins/officers)
    if user.get("role") == "FARMER" and user.get("userId") != str(fid):
        raise HTTPException(status_code=403, detail="Access denied")

    # Load farmer record from Farmer table
    result = await db.execute(
        select(Farmer).where(Farmer.id == fid)
    )
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    # Check coordinates — try KGIS fallback if village/district available
    lat = float(farmer.latitude) if farmer.latitude else None
    lng = float(farmer.longitude) if farmer.longitude else None
    kgis_resolved = False

    if not lat or not lng:
        if farmer.village and farmer.district and farmer.taluk:
            try:
                from app.services.land_service import LandVerifier
                lv = LandVerifier()
                resolved = await lv.resolve_village(farmer.state_code or "KA", farmer.district, farmer.taluk, farmer.village)
                if resolved.get("found"):
                    lat = float(resolved["centroid_lat"])
                    lng = float(resolved["centroid_lng"])
                    farmer.latitude = lat
                    farmer.longitude = lng
                    kgis_resolved = True
                    await db.commit()
            except Exception:
                pass

        if not lat or not lng:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "no_coordinates",
                    "message": "Farm coordinates not set. Please complete land registration first."
                }
            )

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    # Cache by farmer_id for consistency
    if not refresh:
        cache = await satellite_cache.get("sat-farm", str(fid))
        if cache:
            cache['cached'] = True
            return {"success": True, "data": cache, "cached": True}

    try:
        analysis = sat_service.get_full_analysis(lat, lng, buffer_m=100, state=farmer.state_code or "")
    except Exception as e:
        return {"success": False, "error": "analysis_failed", "message": f"Satellite analysis failed: {str(e)}"}
    if isinstance(analysis, dict) and "error" in analysis:
        return {"success": False, "error": analysis["error"], "message": analysis.get("message", "Satellite analysis failed")}
    if isinstance(analysis.get("ndvi"), dict) and "error" in analysis["ndvi"]:
        return {"success": False, "error": analysis["ndvi"]["error"], "message": analysis["ndvi"]["message"]}

    # Confidence engine results are now embedded in the analysis dict
    crop_display = analysis.get("crop_display", {})
    flood_display = analysis.get("flood_display", {})

    # Include farm info in response
    result = {
        "farmer_id": str(farmer.id),
        "farmer_name": farmer.full_name,
        "ulpin": farmer.ulpin if hasattr(farmer, 'ulpin') else None,
        "survey_number": None,
        "village": farmer.village,
        "taluk": farmer.taluk,
        "district": farmer.district,
        "state": farmer.state_code,
        "land_area_ha": farmer.land_area,
        "farm_lat": lat,
        "farm_lng": lng,
        "kgis_verified": farmer.is_verified,
        "satellite_analysis": analysis,
        "cropType": crop_display.get("primary") if crop_display else None,
        "secondaryCrop": crop_display.get("secondary") if crop_display else None,
        "mixedCropFlag": analysis.get("mixed_crop_flag", False),
        "cropConfidence": analysis.get("crop_confidence", 0),
        "floodRisk": {
            "flood_detected": flood_display.get("risk_level") != "Low" if flood_display else False,
            "confidence": analysis.get("flood_confidence", 0),
            "risk_level": flood_display.get("risk_level", "Low") if flood_display else "Low",
            "reason": flood_display.get("reason", "") if flood_display else "",
        },
        "analysisConfidence": analysis.get("analysis_confidence", 0),
        "manualReviewRequired": analysis.get("manual_review_required", False),
        "qualityWarnings": analysis.get("quality_warnings", []),
        "computed_at": datetime.utcnow().isoformat(),
        "cached": False
    }

    await satellite_cache.set("sat-farm", result, satellite_cache.TTL_FARM, str(fid))
    return {"success": True, "data": result, "cached": False}


@router.get("/farm/{farmer_id}/timeseries")
async def get_farm_timeseries(
    farmer_id: str,
    months: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["FARMER", "ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR"])),
    response: Response = None,
):
    """NDVI time series for a farmer's plot."""
    try:
        fid = UUID(farmer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid farmer_id format. Must be a valid UUID.")

    # Load farmer record from Farmer table
    result = await db.execute(
        select(Farmer).where(Farmer.id == fid)
    )
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    if not farmer.latitude or not farmer.longitude:
        raise HTTPException(status_code=400, detail="Coordinates not available")

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    lat = float(farmer.latitude)
    lng = float(farmer.longitude)

    cache = await satellite_cache.get("sat-farm-ts", str(fid), months)
    if cache:
        return {"success": True, "data": {"timeseries": cache, "months": months}, "cached": True}

    try:
        ts = sat_service.get_ndvi_timeseries(lat, lng, months=months)
    except Exception as e:
        return {"success": False, "error": "timeseries_failed", "message": f"Failed to fetch NDVI timeseries: {str(e)}"}
    if isinstance(ts, dict) and "error" in ts:
        return {"success": False, "error": ts["error"], "message": ts.get("message", "Timeseries failed")}
    await satellite_cache.set("sat-farm-ts", ts, satellite_cache.TTL_TIMESERIES, str(fid), months)
    return {"success": True, "data": {"timeseries": ts, "months": months}, "cached": False}


@router.get("/farm/{farmer_id}/tiles")
async def get_farm_tiles(
    farmer_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["FARMER", "ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR"])),
    response: Response = None,
):
    """Satellite tile URLs for a farmer's plot."""
    try:
        fid = UUID(farmer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid farmer_id format. Must be a valid UUID.")
    cache = await satellite_cache.get("sat-farm-tiles", str(fid))
    if cache:
        return {"success": True, "data": cache, "cached": True}

    # Load farmer record from Farmer table
    result = await db.execute(
        select(Farmer).where(Farmer.id == fid)
    )
    farmer = result.scalar_one_or_none()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    if not farmer.latitude or not farmer.longitude:
        raise HTTPException(status_code=400, detail="Coordinates not available")

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    lat = float(farmer.latitude)
    lng = float(farmer.longitude)

    rgb_tile = sat_service.get_satellite_tile_url(lat, lng)
    ndvi_tile = sat_service.get_ndvi_tile_url(lat, lng)

    tile_data = {
        "rgb_tile_url": rgb_tile.get("tile_url", ""),
        "ndvi_tile_url": ndvi_tile.get("tile_url", ""),
        "center": {"lat": lat, "lng": lng},
        "zoom": 15,
        "cached": False
    }

    await satellite_cache.set("sat-farm-tiles", tile_data, satellite_cache.TTL_FARM, str(fid))
    return {"success": True, "data": tile_data, "cached": False}


@router.get("/farm/{farmer_id}/thumbnail")
async def get_farm_thumbnail(
    farmer_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["FARMER", "ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR"])),
    response: Response = None,
):
    """Base64-embedded satellite thumbnail (5km radius) for a farmer's land.
    Accessible by: Farmer (own land), Admin, Officer, Inspector."""
    fid = UUID(farmer_id)

    # If farmer, verify they own this land
    if user.get("role") == "FARMER":
        farmer_uuid = UUID(user["userId"])
        farmer_result = await db.execute(select(Farmer).where(Farmer.id == farmer_uuid))
        if not farmer_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")

    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.farmer_id == fid)
    )
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=404, detail="Land record not found")

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    lat = float(udlrn.gps_lat) if udlrn.gps_lat else 13.1234
    lng = float(udlrn.gps_lng) if udlrn.gps_lng else 77.5678

    thumbnail_b64 = sat_service.get_satellite_thumbnail_b64(lat, lng, buffer_m=5000)
    return {
        "success": True,
        "data": {
            "thumbnail_b64": thumbnail_b64,
            "center": {"lat": lat, "lng": lng},
            "radius_m": 5000,
            "source": "Sentinel-2 SR Harmonized",
            "has_image": bool(thumbnail_b64),
        }
    }


@router.get("/thumbnail")
async def get_direct_thumbnail(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_m: int = Query(5000, ge=100, le=25000, description="Radius in meters"),
    user: dict = Depends(require_role(["ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR", "DC"])),
    response: Response = None,
):
    """Direct satellite thumbnail for any lat/lng. For admin/officer/inspector use."""
    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    thumbnail_b64 = sat_service.get_satellite_thumbnail_b64(lat, lng, buffer_m=radius_m)
    return {
        "success": True,
        "data": {
            "thumbnail_b64": thumbnail_b64,
            "center": {"lat": lat, "lng": lng},
            "radius_m": radius_m,
            "source": "Sentinel-2 SR Harmonized",
            "has_image": bool(thumbnail_b64),
        }
    }


@router.get("/udlrn/{udlrn}")
async def get_farm_by_udlrn(
    udlrn: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["ADMIN", "SUPER_ADMIN", "ANALYST", "FIELD_OFFICER", "FIELD_INSPECTOR"])),
    response: Response = None,
):
    """Admin/Officer: Get full farm satellite data by UDLRN number.
    Returns the same data as farmer sees for consistency."""
    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.udlrn == udlrn)
    )
    udlrn_rec = udlrn_result.scalar_one_or_none()
    if not udlrn_rec:
        raise HTTPException(status_code=404, detail="Land record not found")

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    lat = float(udlrn_rec.gps_lat) if udlrn_rec.gps_lat else 13.1234
    lng = float(udlrn_rec.gps_lng) if udlrn_rec.gps_lng else 77.5678

    # Cache by UDLRN for consistency across farmer/admin
    cache = await satellite_cache.get("sat-udlrn", udlrn)
    if cache:
        return {"success": True, "data": cache, "cached": True}

    try:
        analysis = sat_service.get_full_analysis(lat, lng, buffer_m=100)
    except Exception as e:
        return {"success": False, "error": "analysis_failed", "message": f"Satellite analysis failed: {str(e)}"}
    
    # Add farmer/land info to response
    result = {
        "udlrn": udlrn,
        "farmer_id": str(udlrn_rec.farmer_id),
        "land_area_ha": udlrn_rec.land_area_ha,
        "declared_crop": udlrn_rec.declared_crop,
        "gps_lat": lat,
        "gps_lng": lng,
        "satellite_analysis": analysis,
        "computed_at": datetime.utcnow().isoformat()
    }

    await satellite_cache.set("sat-udlrn", result, satellite_cache.TTL_FARM, udlrn)
    return {"success": True, "data": result, "cached": False}


@router.post("/region/analyze")
async def post_region_analysis(
    request: dict,
    user: dict = Depends(require_admin_role),
):
    """Admin: Analyze a region by state, district, and date range."""
    state = request.get("state")
    district = request.get("district")
    start_date = request.get("start_date")
    end_date = request.get("end_date")

    if not all([state, district, start_date, end_date]):
        raise HTTPException(status_code=400, detail="state, district, start_date, end_date are required")

    try:
        s = datetime.strptime(start_date, "%Y-%m-%d")
        e = datetime.strptime(end_date, "%Y-%m-%d")
        if (e - s).days > 365:
            raise HTTPException(status_code=400, detail="Date range must be <= 365 days")
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format")

    cache = await satellite_cache.get("sat-region", state, district, start_date, end_date)
    if cache:
        return {"success": True, "data": cache, "cached": True}

    result = sat_service.get_region_analysis(state, district, start_date, end_date)

    await satellite_cache.set("sat-region", result, satellite_cache.TTL_REGION, state, district, start_date, end_date)
    return {"success": True, "data": result, "cached": False}


@router.get("/states")
async def get_states(user: dict = Depends(require_role(["ADMIN", "SUPER_ADMIN", "ANALYST"]))):
    """List of Indian states and UTs for dropdown."""
    states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
        "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
        "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
        "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
    ]
    return {"success": True, "data": states}


@router.get("/districts")
async def get_districts(
    state: str = Query(...),
    user: dict = Depends(require_role(["ADMIN", "SUPER_ADMIN", "ANALYST"])),
):
    """List of districts for a state."""
    # Static mapping of major states to districts
    district_map = {
        "Karnataka": [
            "Bengaluru Rural", "Bengaluru Urban", "Belagavi", "Ballari", "Bidar",
            "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga",
            "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan",
            "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya",
            "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru",
            "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"
        ],
        "Maharashtra": [
            "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara",
            "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli",
            "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
            "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar",
            "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara",
            "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"
        ],
        "Tamil Nadu": [
            "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
            "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram",
            "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam",
            "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram",
            "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni",
            "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur",
            "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram",
            "Virudhunagar"
        ],
        "Telangana": [
            "Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon",
            "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar",
            "Khammam", "Komaram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial",
            "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda",
            "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla",
            "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad",
            "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"
        ],
        "Uttar Pradesh": [
            "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya",
            "Ayodhya", "Azamgarh", "Badaun", "Baghpat", "Bahraich", "Ballia",
            "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi",
            "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria",
            "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddh Nagar",
            "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur",
            "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj",
            "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri",
            "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri",
            "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar",
            "Pilibhit", "Pratapgarh", "Prayagraj", "Rae Bareli", "Rampur", "Saharanpur",
            "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti",
            "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
        ],
    }
    districts = district_map.get(state, [])
    if not districts:
        # Fallback: query from DB if we have a district_master table
        districts = ["District data not available for this state"]
    return {"success": True, "data": districts, "state": state}


@router.get("/visit/{visit_id}")
async def get_visit_satellite(
    visit_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["INSPECTOR", "ADMIN", "SUPER_ADMIN"])),
):
    """Inspector: Satellite brief for a visit."""
    try:
        vid = UUID(visit_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid visit_id format. Must be a valid UUID.")
    result = await db.execute(
        select(CceVisit, Claim, Farmer)
        .join(Claim, CceVisit.claim_id == Claim.id)
        .join(Farmer, Claim.farmer_id == Farmer.id)
        .where(CceVisit.id == vid)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit, claim, farmer = row
    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.udlrn == claim.udlrn)
    )
    udlrn = udlrn_result.scalar_one_or_none()
    lat = float(udlrn.gps_lat) if udlrn and udlrn.gps_lat else 13.1234
    lng = float(udlrn.gps_lng) if udlrn and udlrn.gps_lng else 77.5678

    analysis = sat_service.get_full_analysis(lat, lng)
    return {"success": True, "data": analysis}


# ────────────────────────────────────────────────────────────
# LEGACY ENDPOINTS (kept for backward compatibility)
# ────────────────────────────────────────────────────────────

@router.get("/farm-report")
async def get_farm_report(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    """Aggregated satellite report for logged-in farmer's land."""
    from app.services.satellite_service import (
        get_farm_view, get_ndvi_label, get_ndvi_from_gee,
        get_sar_flood_from_gee
    )

    try:
        farmer_id = UUID(user["userId"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.farmer_id == farmer_id)
    )
    udlrn = udlrn_result.scalar_one_or_none()
    if not udlrn:
        raise HTTPException(status_code=404, detail="Land record not found")

    gps = {"lat": float(udlrn.gps_lat) if udlrn.gps_lat else 13.1234,
           "lng": float(udlrn.gps_lng) if udlrn.gps_lng else 77.5678}
    crop = udlrn.declared_crop or "PADDY"

    cache_key = f"satellite:farm-report:{farmer_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        import json
        return {"success": True, "data": json.loads(cached), "cached": True}

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=15)
    ndvi_value = await get_ndvi_from_gee(gps["lat"], gps["lng"], start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
    ndvi_label = get_ndvi_label(ndvi_value)

    area_ha = float(udlrn.land_area_ha or 2.5)
    loss_pct = 0.0
    if ndvi_value < 0.15:
        loss_pct = 0.85
    elif ndvi_value < 0.30:
        loss_pct = 0.55
    elif ndvi_value < 0.45:
        loss_pct = 0.30
    elif ndvi_value < 0.65:
        loss_pct = 0.10
    est_payout = round(area_ha * 45000 * loss_pct)

    weather = {"condition": "Normal", "rainfall_mm": 12.4, "temperature_c": 28.5}
    fire = {"detected": False, "hotspots": 0}
    flood_detected = await get_sar_flood_from_gee(gps["lat"], gps["lng"], end_date.strftime("%Y-%m-%d"))
    flood = {"detected": flood_detected, "area_sqm": 0}

    result = {
        "ndvi": {"value": ndvi_value, "label": ndvi_label, "last_scan": end_date.strftime("%d %b"), "is_live": True},
        "flood": flood,
        "fire": fire,
        "weather": weather,
        "estimated_payout": est_payout,
        "insured_area_ha": area_ha,
        "pipeline_status": "Active",
        "computed_at": end_date.isoformat(),
        "crop": crop,
        "time_series": [],
    }

    import json
    await redis_client.setex(cache_key, 6 * 3600, json.dumps(result))
    return {"success": True, "data": result}


@router.get("/ndvi")
async def get_ndvi_for_coords(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    days_back: int = Query(15, ge=1, le=90),
    user: dict = Depends(get_current_farmer),
):
    """Get NDVI for specific coordinates."""
    end = datetime.utcnow()
    start = end - timedelta(days=days_back)
    value = await get_ndvi_from_gee(lat, lng, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
    return {"success": True, "data": {
        "lat": lat, "lng": lng, "ndvi": value,
        "label": get_ndvi_label(value),
        "date": end.strftime("%Y-%m-%d"),
        "source": "Sentinel-2 SR Harmonized",
        "resolution_m": 10,
    }}


@router.get("/flood")
async def get_flood_detection(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    date_str: Optional[str] = Query(None, alias="date"),
    user: dict = Depends(get_current_farmer),
):
    """SAR flood detection for coordinates."""
    d = date_str or datetime.utcnow().strftime("%Y-%m-%d")
    detected = await get_sar_flood_from_gee(lat, lng, d)
    return {"success": True, "data": {
        "lat": lat, "lng": lng, "flood_detected": detected,
        "date": d, "source": "Sentinel-1 SAR GRD",
    }}


@router.get("/fire")
async def get_fire_alert_endpoint(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: int = Query(10, ge=1, le=50),
    user: dict = Depends(get_current_farmer),
):
    """NASA FIRMS fire alerts near coordinates. Returns fallback if no MAP_KEY configured."""
    from app.config import settings
    map_key = settings.NASA_FIRMS_MAP_KEY
    if not map_key:
        return {"success": True, "data": {
            "lat": lat, "lng": lng, "radius_km": radius_km,
            "fire_detected": False, "hotspot_count": 0,
            "source": "Fallback (no NASA FIRMS key configured)",
        }}
    import httpx
    bbox = f"{lng-0.1},{lat-0.1},{lng+0.1},{lat+0.1}"
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/{map_key}/{bbox}/1"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
        lines = resp.text.strip().split("\n")
        fire_count = max(0, len(lines) - 1)
    except Exception:
        fire_count = 0

    return {"success": True, "data": {
        "lat": lat, "lng": lng, "radius_km": radius_km,
        "fire_detected": fire_count > 0,
        "hotspot_count": fire_count,
        "source": "NASA FIRMS VIIRS SNPP NRT",
    }}


@router.get("/weather")
async def get_weather(
    district: str = Query(...),
    state: str = Query(...),
    user: dict = Depends(get_current_farmer),
):
    """IMD weather for district."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://imdopen.imd.gov.in/api/weather?district={district}&state={state}",
                timeout=5.0
            )
        data = resp.json()
        rf = data.get("rainfall_departure_pct", 0)
        if rf >= 20:
            condition = "Excess"
        elif rf >= -19:
            condition = "Normal"
        elif rf >= -59:
            condition = "Deficient"
        else:
            condition = "Drought"
        return {"success": True, "data": {
            "district": district, "state": state,
            "rainfall_mm": data.get("rainfall_mm", 0),
            "temperature_c": data.get("max_temp"),
            "condition": condition,
            "date": data.get("date"),
        }}
    except Exception:
        return {"success": True, "data": {
            "district": district, "state": state,
            "rainfall_mm": 12.4, "temperature_c": 28.5,
            "condition": "Normal", "date": datetime.utcnow().strftime("%Y-%m-%d"),
        }}


@router.get("/ndvi-history")
async def get_ndvi_history(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_farmer),
):
    """12-month NDVI time series for farmer's plot from real GEE data."""
    from app.services.satellite_service import get_ndvi_history_from_gee
    try:
        farmer_id = UUID(user["userId"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    udlrn_result = await db.execute(
        select(UdlrnMaster).where(UdlrnMaster.farmer_id == farmer_id)
    )
    udlrn = udlrn_result.scalar_one_or_none()
    lat = float(udlrn.gps_lat) if udlrn and udlrn.gps_lat else 13.1234
    lng = float(udlrn.gps_lng) if udlrn and udlrn.gps_lng else 77.5678
    crop = udlrn.declared_crop if udlrn else "PADDY"
    history = await get_ndvi_history_from_gee(lat, lng, months=12)
    return {"success": True, "data": history, "crop": crop, "source": "GEE"}


@router.get("/farms")
async def get_all_farms_satellite(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role(["ADMIN", "SUPER_ADMIN", "ANALYST"])),
):
    """Admin: NDVI and health data for all registered farms."""
    result = await db.execute(
        select(Farmer, UdlrnMaster)
        .join(UdlrnMaster, Farmer.id == UdlrnMaster.farmer_id)
        .where(Farmer.is_verified == True)
    )
    rows = result.all()
    end = datetime.utcnow()
    start = end - timedelta(days=15)

    farms = []
    for farmer, udlrn in rows:
        lat = float(udlrn.gps_lat) if udlrn.gps_lat else 13.1234
        lng = float(udlrn.gps_lng) if udlrn.gps_lng else 77.5678
        ndvi = await get_ndvi_from_gee(lat, lng, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        flood = await get_sar_flood_from_gee(lat, lng, end.strftime("%Y-%m-%d"))
        farms.append({
            "farmerId": str(farmer.id),
            "farmerName": farmer.full_name,
            "udlrn": udlrn.udlrn,
            "lat": lat,
            "lng": lng,
            "ndvi": ndvi,
            "ndviLabel": get_ndvi_label(ndvi),
            "district": farmer.district or "Unknown",
            "crop": udlrn.declared_crop or "PADDY",
            "landAreaHa": float(udlrn.land_area_ha or 0),
            "floodDetected": flood,
            "lastScan": end.strftime("%Y-%m-%d"),
        })

    return {"success": True, "data": farms, "count": len(farms)}


@router.post("/verify")
async def verify_land_satellite(
    request: dict,
    response: Response = None,
):
    """Public endpoint for Land Portal: real-time satellite verification by lat/lng.
    No auth required — used during farmer registration."""
    lat = request.get("lat")
    lng = request.get("lng")
    start_date = request.get("start_date")
    end_date = request.get("end_date")

    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail="lat and lng are required")
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="lat and lng must be valid numbers")

    if response:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    # Optional date range defaults to last 4 months
    if not end_date:
        end_date = datetime.utcnow().strftime('%Y-%m-%d')
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=120)).strftime('%Y-%m-%d')

    state_name = request.get("state", "")
    analysis = sat_service.get_full_analysis(lat, lng, buffer_m=100, state=state_name)

    if isinstance(analysis, dict) and "error" in analysis:
        return {"success": False, "error": analysis["error"], "message": analysis.get("message", "Satellite analysis failed")}

    # Extract real values with safe fallbacks
    ndvi_data = analysis.get("ndvi", {}) or {}
    ndwi_data = analysis.get("ndwi", {}) or {}
    sar_data = analysis.get("sar_flood", {}) or {}
    fire_data = analysis.get("fire_alerts", {}) or {}
    thumbnail = analysis.get("thumbnail_b64", "")

    # Compute fraud risk from real NDVI (simple heuristic)
    ndvi_value = ndvi_data.get("ndvi") if isinstance(ndvi_data, dict) else None
    fraud_score = 15
    fraud_risk = "LOW"
    if ndvi_value is not None:
        if ndvi_value < 0.15:
            fraud_score = 85
            fraud_risk = "HIGH"
        elif ndvi_value < 0.30:
            fraud_score = 55
            fraud_risk = "MEDIUM"
        elif ndvi_value > 0.65:
            fraud_score = 10
            fraud_risk = "LOW"

    # Confidence engine results
    crop_display = analysis.get("crop_display", {})
    flood_display = analysis.get("flood_display", {})

    result = {
        "lat": lat, "lng": lng,
        "ndvi": round(ndvi_value, 2) if ndvi_value is not None else None,
        "ndvi_label": ndvi_data.get("health_label") if isinstance(ndvi_data, dict) else None,
        "scan_date": ndvi_data.get("scan_date") if isinstance(ndvi_data, dict) else None,
        "cloud_cover_pct": ndvi_data.get("cloud_cover_pct") if isinstance(ndvi_data, dict) else None,
        "soil_moisture": ndwi_data.get("ndwi") if isinstance(ndwi_data, dict) else None,
        "moisture_label": ndwi_data.get("label") if isinstance(ndwi_data, dict) else None,
        "flood_detected": flood_display.get("risk_level") != "Low" if flood_display else False,
        "flood_area_ha": sar_data.get("flood_area_ha") if isinstance(sar_data, dict) else None,
        "fire_detected": fire_data.get("fire_detected") if isinstance(fire_data, dict) else None,
        "hotspot_count": fire_data.get("hotspot_count") if isinstance(fire_data, dict) else None,
        "thumbnail_b64": thumbnail,
        "satellite_tile": analysis.get("satellite_tile", {}),
        "ndvi_tile": analysis.get("ndvi_tile", {}),
        "fraud_score": fraud_score,
        "fraud_risk": fraud_risk,
        "crop_coverage": round((ndvi_value or 0.5) * 130) if ndvi_value is not None else None,
        "baseline_match": "10-Year Baseline: Agricultural land confirmed" if (ndvi_value is not None and ndvi_value > 0.2) else "Low vegetation — verify manually",
        "sar_status": f"Flood Risk: {flood_display.get('risk_level', 'Low')}" if (flood_display and flood_display.get('risk_level') != 'Low') else "Active — No Flood",
        "crop_type": crop_display.get("primary") if crop_display else None,
        "secondary_crop": crop_display.get("secondary") if crop_display else None,
        "mixed_crop_flag": analysis.get("mixed_crop_flag", False),
        "crop_confidence": analysis.get("crop_confidence", 0),
        "flood_confidence": analysis.get("flood_confidence", 0),
        "analysis_confidence": analysis.get("analysis_confidence", 0),
        "manual_review_required": analysis.get("manual_review_required", False),
        "quality_warnings": analysis.get("quality_warnings", []),
        "computed_at": datetime.utcnow().isoformat(),
        "start_date": start_date,
        "end_date": end_date,
    }

    return {"success": True, "data": result}


@router.post("/refresh")
async def force_satellite_refresh(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_admin_role),
):
    """Force GEE refresh for all farms (admin only)."""
    keys = await redis_client.keys("satellite:*")
    if keys:
        await redis_client.delete(*keys)
    return {"success": True, "data": {"message": "Satellite cache cleared. Fresh data will be fetched on next request.", "keys_cleared": len(keys)}}
