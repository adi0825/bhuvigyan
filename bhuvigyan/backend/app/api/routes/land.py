from fastapi import APIRouter, Query
from typing import Optional
from app.services.kgis_service import (
    get_admin_hierarchy, get_survey_numbers,
    get_survey_polygon, get_nearby_admin
)

router = APIRouter()


@router.get("/admin-hierarchy")
async def admin_hierarchy(
    village_code: str,
    code_type: str = "lgd"
):
    return await get_admin_hierarchy(village_code, code_type)


@router.get("/survey-numbers")
async def survey_numbers(
    village_code: str,
    lat: float = Query(...),
    lng: float = Query(...),
    distance: int = 500
):
    return await get_survey_numbers(
        village_code, lat, lng, distance
    )


@router.get("/survey-polygon")
async def survey_polygon(
    kgis_village_id: str,
    survey_number: str,
    coord_type: str = "DD"
):
    return await get_survey_polygon(
        kgis_village_id, survey_number, coord_type
    )


@router.get("/nearby-admin")
async def nearby_admin(
    lat: float = Query(...),
    lng: float = Query(...),
    distance: int = 5000,
    aoi: str = "d,t,h"
):
    return await get_nearby_admin(lat, lng, distance, aoi)
