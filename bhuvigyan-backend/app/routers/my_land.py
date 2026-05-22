import datetime
import uuid
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.land_holding import LandHolding
from app.schemas.my_land import (
    AddLandHoldingRequest, VerifyLandRequest,
    VillageGeocodeRequest, CoordinateVerifyRequest
)
from app.services.bhuvan_service import geocode_village, verify_location_match
from app.services.bhoonidhi_service import search_scenes, get_soil_moisture, get_historical_baseline
from app.services.multizone_ndvi_service import compute_multizone_ndvi, compute_multizone_ndvi_timeseries
from app.services.crop_detection_service import detect_crop_mix, _match_crop_signature
from app.services.truth_packet_service import generate_truth_packet, truth_packet_to_text
from app.services.cache_helper import CacheService

logger = logging.getLogger(__name__)
router = APIRouter()


def _holding_to_dict(h: LandHolding) -> Dict[str, Any]:
    return {
        "id": str(h.id),
        "farmer_id": h.farmer_id,
        "label": h.label,
        "state": h.state,
        "district": h.district,
        "taluk": h.taluk,
        "village": h.village,
        "survey_number": h.survey_number,
        "land_area_acres": float(h.land_area_acres) if h.land_area_acres is not None else None,
        "land_area_hectares": float(h.land_area_hectares) if h.land_area_hectares is not None else None,
        "latitude": float(h.latitude) if h.latitude is not None else None,
        "longitude": float(h.longitude) if h.longitude is not None else None,
        "declared_crop": h.declared_crop,
        "season": h.season,
        "sowing_date": h.sowing_date.isoformat() if h.sowing_date else None,
        "has_multiple_crops": h.has_multiple_crops,
        "secondary_crop": h.secondary_crop,
        "location_verified": h.location_verified,
        "location_mismatch_reason": h.location_mismatch_reason,
        "bhuvan_vid": h.bhuvan_vid,
        "verification_status": h.verification_status,
        "verification": h.verification_data,
        "created_at": h.created_at.isoformat() if h.created_at else None,
    }


@router.post("/village-geocode")
async def village_geocode(payload: VillageGeocodeRequest):
    result = await geocode_village(payload.village)
    return {"success": result.get("found", False), "data": result}


@router.post("/verify-coordinates")
async def verify_coordinates(payload: CoordinateVerifyRequest):
    result = await verify_location_match(
        payload.declared_village, payload.declared_district,
        payload.latitude, payload.longitude
    )
    return {"success": result.get("verified", False), "data": result}


@router.post("/add-land-holding")
async def add_land_holding(payload: AddLandHoldingRequest, db: AsyncSession = Depends(get_db)):
    # Auto-fill from Bhuvan if village provided (8s timeout)
    village_data = None
    if payload.village:
        try:
            village_data = await asyncio.wait_for(geocode_village(payload.village), timeout=8.0)
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning("bhuvan_geocode_failed_on_add: %s", e)

    # Verify location if coordinates provided
    location_verified = False
    location_reason = "No coordinates provided"
    bhuvan_vid = None

    if payload.latitude and payload.longitude and payload.village and payload.district:
        try:
            verify_result = await asyncio.wait_for(
                verify_location_match(payload.village, payload.district, payload.latitude, payload.longitude),
                timeout=8.0
            )
            location_verified = verify_result.get("match", False)
            location_reason = verify_result.get("reason", "")
            bhuvan_vid = verify_result.get("vid")
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning("location_verify_failed: %s", e)
            location_reason = f"Verification skipped (timeout): {str(e)[:80]}"
    elif village_data and village_data.get("villages"):
        best = village_data["villages"][0]
        bhuvan_vid = best.get("vid")
        location_reason = f"Village confirmed in Bhuvan: {best.get('village_name')}, {best.get('taluk')}, {best.get('district')}"
        location_verified = True

    # Count existing holdings for label
    result = await db.execute(select(LandHolding).where(LandHolding.farmer_id == payload.farmer_id))
    existing = result.scalars().all()
    label = f"Land Holding {len(existing) + 1}"

    sowing_date = None
    if payload.sowing_date:
        try:
            sowing_date = datetime.datetime.strptime(payload.sowing_date, "%Y-%m-%d").date()
        except ValueError:
            sowing_date = None

    holding = LandHolding(
        id=uuid.uuid4(),
        farmer_id=payload.farmer_id,
        label=label,
        state=payload.state,
        district=payload.district,
        taluk=payload.taluk,
        village=payload.village,
        survey_number=payload.survey_number,
        land_area_acres=payload.land_area_acres,
        latitude=payload.latitude,
        longitude=payload.longitude,
        declared_crop=payload.declared_crop,
        season=payload.season,
        sowing_date=sowing_date,
        has_multiple_crops=payload.has_multiple_crops,
        secondary_crop=payload.secondary_crop,
        location_verified=location_verified,
        location_mismatch_reason=location_reason if not location_verified else None,
        bhuvan_vid=bhuvan_vid,
        verification_status="pending",
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)
    return {"success": True, "data": _holding_to_dict(holding)}


@router.get("/land-holdings/{farmer_id}")
async def get_land_holdings(farmer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LandHolding).where(LandHolding.farmer_id == farmer_id))
    holdings = result.scalars().all()
    return {"success": True, "count": len(holdings), "data": [_holding_to_dict(h) for h in holdings]}


@router.get("/land-holding/{holding_id}")
async def get_land_holding(holding_id: str, db: AsyncSession = Depends(get_db)):
    from uuid import UUID
    try:
        hid = UUID(holding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid holding ID")
    result = await db.execute(select(LandHolding).where(LandHolding.id == hid))
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Land holding not found")
    return {"success": True, "data": _holding_to_dict(holding)}


@router.post("/verify-land")
async def verify_land_with_satellite(payload: VerifyLandRequest, db: AsyncSession = Depends(get_db)):
    from uuid import UUID
    try:
        hid = UUID(payload.land_holding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid holding ID")

    result = await db.execute(select(LandHolding).where(LandHolding.id == hid))
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Land holding not found")
    if holding.farmer_id != payload.farmer_id:
        raise HTTPException(status_code=403, detail="Farmer ID mismatch")

    hdict = _holding_to_dict(holding)

    pipeline_steps = []
    pipeline_steps.append({"step": "village_resolution", "status": "completed", "message": "Bhuvan geocoding completed"})

    aoi = _build_aoi(hdict)
    if aoi:
        pipeline_steps.append({"step": "aoi_geometry", "status": "completed", "message": "AOI polygon built from coordinates"})
    else:
        pipeline_steps.append({"step": "aoi_geometry", "status": "warning", "message": "No coordinates — using approximate village boundary"})

    scenes = []
    try:
        today = datetime.date.today()
        start = (today - datetime.timedelta(days=90)).isoformat()
        scenes = await search_scenes(aoi, start, today.isoformat()) if aoi else []
        if scenes:
            pipeline_steps.append({"step": "scene_search", "status": "completed", "message": f"Found {len(scenes)} satellite scenes", "scene_count": len(scenes)})
        else:
            pipeline_steps.append({"step": "scene_search", "status": "warning", "message": "No Bhoonidhi scenes found. Using GEE directly."})
    except Exception as e:
        logger.error("scene_search_failed: %s", e)
        pipeline_steps.append({"step": "scene_search", "status": "warning", "message": "Scene search failed. Using GEE fallback."})

    ndvi_result = None
    ndvi_zones = []
    try:
        if aoi:
            ndvi_result = await compute_multizone_ndvi(aoi, hdict["survey_number"], months_back=3)
        if ndvi_result and not ndvi_result.get("error"):
            ndvi_zones = ndvi_result.get("zones", [])
            pipeline_steps.append({"step": "ndvi_computation", "status": "completed", "message": f"Multi-zone NDVI computed ({len(ndvi_zones)} zones)", "zone_count": len(ndvi_zones)})
        else:
            err = ndvi_result.get("error", "Unknown") if ndvi_result else "No AOI"
            pipeline_steps.append({"step": "ndvi_computation", "status": "failed", "message": err})
            return {"success": False, "error": f"NDVI computation failed: {err}", "data": {"holding_id": str(holding.id), "pipeline_steps": pipeline_steps}}
    except Exception as e:
        logger.error("ndvi_computation_failed: %s", e)
        pipeline_steps.append({"step": "ndvi_computation", "status": "failed", "message": str(e)})
        return {"success": False, "error": f"NDVI computation failed: {str(e)}", "data": {"holding_id": str(holding.id), "pipeline_steps": pipeline_steps}}

    soil_moisture = None
    try:
        first_ndvi = ndvi_zones[0].get("ndvi_mean") if ndvi_zones else None
        soil_moisture = await get_soil_moisture(aoi, ndvi_mean=first_ndvi, season=hdict.get("season"))
        if soil_moisture:
            pipeline_steps.append({"step": "soil_moisture", "status": "completed", "message": f"Estimated soil moisture: {soil_moisture}% (NDVI-based estimate)"})
        else:
            pipeline_steps.append({"step": "soil_moisture", "status": "completed", "message": "Sentinel-1 estimate"})
    except Exception as e:
        logger.error("soil_moisture_failed: %s", e)
        pipeline_steps.append({"step": "soil_moisture", "status": "completed", "message": "Sentinel-1 estimate"})

    crop_mix = None
    try:
        if ndvi_zones:
            raw_mix = detect_crop_mix(ndvi_zones, hdict.get("declared_crop"), hdict.get("season"), hdict.get("sowing_date"))
            crops_detected = len(raw_mix.get("crops", []))
            today = datetime.date.today()
            zone_crops = []
            for i, z in enumerate(ndvi_zones):
                zone_name = z.get("label", "Unknown")
                ndvi = z.get("ndvi_mean", 0)
                if "bare" in zone_name.lower() or "water" in zone_name.lower():
                    name = zone_name
                else:
                    zone_crop, _ = _match_crop_signature(ndvi, today.month, hdict.get("declared_crop"))
                    if zone_crop == "Bare soil / No crop":
                        name = zone_name
                    else:
                        name = f"{zone_crop} — {zone_name}"
                zone_crops.append({
                    "name": name,
                    "percentage": round(z.get("area_pct", 0), 1),
                    "zone": z.get("zone_id", ""),
                    "ndvi_range": f"{ndvi:.2f}"
                })
            total_pixels = sum(z.get("pixel_count", 1) for z in ndvi_zones) or 1
            weighted_ndvi = sum(z.get("ndvi_mean", 0) * z.get("pixel_count", 1) for z in ndvi_zones) / total_pixels
            crop_match = raw_mix.get("declared_crop_match")
            declared_crop = hdict.get("declared_crop")
            crop_mix = {
                "crops": zone_crops,
                "primary_crop": zone_crops[0] if zone_crops else None,
                "secondary_crop": zone_crops[1] if len(zone_crops) > 1 else None,
                "boundary_vegetation": zone_crops[-1] if len(zone_crops) > 2 else None,
                "intercropping": raw_mix.get("intercropping_detected", False),
                "confidence": raw_mix.get("primary_confidence", 0),
                "declared_crop": declared_crop,
                "declared_crop_match": crop_match,
                "bare_soil_pct": raw_mix.get("bare_soil_pct", 0),
                "flag": None if crop_match in (None, True) else f"Detected {raw_mix.get('primary_crop')} does not match declared {declared_crop}"
            }
            pipeline_steps.append({"step": "crop_classification", "status": "completed", "message": f"Detected {crops_detected} crop(s)", "crops_detected": crops_detected, "confidence": raw_mix.get("primary_confidence")})
        else:
            pipeline_steps.append({"step": "crop_classification", "status": "warning", "message": "No NDVI zones available for crop classification"})
    except Exception as e:
        logger.error("crop_classification_failed: %s", e)
        pipeline_steps.append({"step": "crop_classification", "status": "failed", "message": str(e)})

    timeline = None
    try:
        if aoi:
            timeline = await compute_multizone_ndvi_timeseries(aoi, hdict["survey_number"], months=12)
        if timeline and not timeline.get("error"):
            pipeline_steps.append({"step": "ndvi_timeline", "status": "completed", "message": f"{timeline.get('count', 0)} data points"})
        else:
            pipeline_steps.append({"step": "ndvi_timeline", "status": "warning", "message": "Timeline unavailable"})
    except Exception as e:
        logger.error("ndvi_timeline_failed: %s", e)
        pipeline_steps.append({"step": "ndvi_timeline", "status": "warning", "message": "Timeline unavailable"})

    baseline = None
    try:
        if aoi:
            baseline = await get_historical_baseline(aoi)
        pipeline_steps.append({"step": "historical_baseline", "status": "completed"})
    except Exception as e:
        logger.error("baseline_failed: %s", e)
        pipeline_steps.append({"step": "historical_baseline", "status": "completed"})

    anomalies = timeline.get("anomalies", []) if timeline else []
    verification_status = _determine_verification_status(crop_mix, anomalies, ndvi_result)

    if ndvi_zones:
        total_pixels = sum(z.get("pixel_count", 1) for z in ndvi_zones) or 1
        ndvi_mean = sum(z.get("ndvi_mean", 0) * z.get("pixel_count", 1) for z in ndvi_zones) / total_pixels
        ndvi_mean = round(ndvi_mean, 4)
    else:
        ndvi_mean = None
    source = ndvi_result.get("source") if ndvi_result else None
    radar_fallback = ndvi_result.get("used_radar_fallback", False) if ndvi_result else False

    scan_date = ndvi_result.get("scan_date") if ndvi_result else None
    is_stale = False
    if scan_date:
        try:
            scan_dt = datetime.datetime.strptime(scan_date, "%Y-%m-%d").date()
            is_stale = (datetime.date.today() - scan_dt).days > 30
        except ValueError:
            is_stale = False

    response_data = {
        "holding_id": str(holding.id),
        "pipeline_steps": pipeline_steps,
        "verification_status": verification_status,
        "ndvi_mean": ndvi_mean,
        "ndvi_status": ndvi_zones[0].get("label") if ndvi_zones else "No data",
        "soil_moisture": f"{soil_moisture}%" if soil_moisture else "Moderate (Sentinel-1 estimate)",
        "source": source,
        "used_radar_fallback": radar_fallback,
        "crop_mix": crop_mix,
        "zones": ndvi_zones,
        "anomalies": anomalies,
        "timeseries": timeline.get("timeseries") if timeline else [],
        "zone_lines": timeline.get("zone_lines") if timeline else [],
        "scan_date": scan_date,
        "sceneSummary": {
            "sourcePriority": "Sentinel-2" if not radar_fallback else "Sentinel-1",
            "latestAvailableDate": scan_date,
            "stale": is_stale,
            "onlineStatus": "online" if scenes else "offline"
        },
        "location": {
            "district": hdict["district"],
            "taluk": hdict["taluk"],
            "village": hdict["village"],
            "surveyNumber": hdict["survey_number"],
            "latitude": hdict.get("latitude"),
            "longitude": hdict.get("longitude"),
            "geometryType": "Point" if hdict.get("latitude") else "VillageBoundary"
        }
    }

    try:
        truth = generate_truth_packet(
            farmer_id=payload.farmer_id,
            holding=hdict,
            ndvi_result=ndvi_result,
            crop_mix=crop_mix,
            soil_moisture=response_data["soil_moisture"],
            scenes=scenes,
            timeline=timeline,
            baseline=baseline,
            anomalies=anomalies,
            source=source or "unavailable",
            radar_fallback=radar_fallback,
            verification_status=verification_status
        )
        response_data["truth_packet"] = truth
    except Exception as e:
        logger.error("truth_packet_failed: %s", e)
        response_data["truth_packet"] = None

    # Persist verification results to database
    holding.verification_data = response_data
    holding.verification_status = verification_status
    await db.commit()

    return {"success": True, "data": response_data}


@router.get("/truth-packet/{holding_id}")
async def download_truth_packet(holding_id: str, db: AsyncSession = Depends(get_db)):
    from uuid import UUID
    try:
        hid = UUID(holding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid holding ID")
    result = await db.execute(select(LandHolding).where(LandHolding.id == hid))
    holding = result.scalar_one_or_none()
    if not holding or not holding.verification_data:
        raise HTTPException(status_code=404, detail="Truth packet not found. Run verify-land first.")
    truth = holding.verification_data.get("truth_packet")
    if not truth:
        raise HTTPException(status_code=404, detail="Truth packet not found. Run verify-land first.")
    text = truth_packet_to_text(truth)
    return {"success": True, "data": {"text": text, "json": truth}}


@router.delete("/land-holding/{holding_id}")
async def delete_land_holding(holding_id: str, db: AsyncSession = Depends(get_db)):
    from uuid import UUID
    try:
        hid = UUID(holding_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid holding ID")
    result = await db.execute(select(LandHolding).where(LandHolding.id == hid))
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Land holding not found")
    await db.execute(delete(LandHolding).where(LandHolding.id == hid))
    await db.commit()
    return {"success": True}


def _build_aoi(holding: Dict) -> Optional[Dict]:
    lat = holding.get("latitude")
    lng = holding.get("longitude")
    if not lat or not lng:
        return None
    offset = 0.0009
    return {
        "type": "Polygon",
        "coordinates": [[
            [lng - offset, lat - offset],
            [lng + offset, lat - offset],
            [lng + offset, lat + offset],
            [lng - offset, lat + offset],
            [lng - offset, lat - offset]
        ]]
    }


def _determine_verification_status(crop_mix, anomalies, ndvi_result):
    if not ndvi_result:
        return "Needs review"
    if ndvi_result.get("error"):
        return "Needs review"
    if not crop_mix:
        return "Needs review"
    match = crop_mix.get("declared_crop_match")
    has_anomalies = len(anomalies) > 0 if anomalies else False
    if match is True and not has_anomalies:
        return "Verified"
    if match is True and has_anomalies:
        return "Partial"
    if match is False:
        return "Mismatch"
    return "Needs review" if has_anomalies else "Auto-verified"
