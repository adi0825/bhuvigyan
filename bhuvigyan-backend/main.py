from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from contextlib import asynccontextmanager
from datetime import datetime
import uvicorn

from app.config import settings
from app.database import engine, Base
from app.redis_client import redis_client
from app.routers import (
    farmer_auth, farmer_data, admin_auth, admin_data,
    csc, officer, insurer, state_dc, locations, system, audit, claims, auth_refresh,
    state_adapters, model_registry, system_config, fraud_scoring, evidence,
    notifications, reports, dossier, state_claims,
    inspector, admin_inspector, inspector_auth,
    payments, carbon_credits, farm_registrations,
    satellite, land, analysis,
    csc_portal, insurer_portal,
    farmer_insurance, insurer_policies,
    my_land
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    print("Redis connected")

    # Auto-create tables if missing, then seed default accounts
    from app.database import async_session, init_db
    from sqlalchemy import select, text
    try:
        await init_db()
        print("Database tables verified.")
    except Exception as e:
        print(f"Table creation check: {e}")
    from app.models.admin import AdminOfficer
    from app.models.field_officer import FieldOfficer
    from app.models.csc_operator import CscOperator
    from app.models.farmer import Farmer
    from app.utils.password_utils import get_password_hash
    from uuid import uuid4

    async with async_session() as db:
        # Check if any admin exists
        result = await db.execute(select(AdminOfficer).limit(1))
        if not result.scalar_one_or_none():
            print("Seeding default accounts...")
            db.add(AdminOfficer(
                id=uuid4(), email="superadmin@bhuvigyan.gov.in",
                full_name="Super Admin", role="SUPER_ADMIN",
                password_hash=get_password_hash("Admin@123"), is_active=True
            ))
            db.add(FieldOfficer(
                id=uuid4(), email="inspector.ka@bhuvigyan.gov.in",
                full_name="Inspector Kumar", role="FIELD_OFFICER",
                employee_id="EMP-KA-0001", designation="Field Officer",
                password_hash=get_password_hash("Password@123"), is_active=True
            ))
            db.add(CscOperator(
                id=uuid4(), csc_id="CSC-KA-001", name="CSC Operator",
                mobile="9900000000",
                password_hash=get_password_hash("Csc@123"), is_blocked=False
            ))
            # Seed demo farmers if none exist
            farmer_result = await db.execute(select(Farmer).limit(1))
            if not farmer_result.scalar_one_or_none():
                from app.models.udlrn_master import UdlrnMaster
                from app.models.notification import Notification
                farmer_names = ["Rajesh Kumar","Suresh Patil","Mohan Reddy","Ravi Gowda","Anil Sharma","Sunita Devi","Geeta Bai"]
                for i in range(1, 8):
                    farmer = Farmer(
                        id=uuid4(), mobile=f"990000000{i}", full_name=farmer_names[i-1],
                        is_verified=True, carbon_eligible=True, state_code="KA",
                        district="Bengaluru Rural", bank_name="State Bank of India",
                        bank_ifsc="SBIN0001234", bank_account=f"1234567890{i}"
                    )
                    db.add(farmer)
                    await db.flush()
                    db.add(UdlrnMaster(
                        udlrn=f"KA01-2024-0000{i}", farmer_id=farmer.id,
                        land_area_ha=2.5, declared_crop="PADDY", carbon_score=100
                    ))
                    db.add(Notification(
                        id=uuid4(), farmer_id=farmer.id,
                        title="Welcome to Bhuvigyan",
                        message=f"Namaste {farmer_names[i-1]}, your land has been verified.",
                        is_read=False, channel="IN_APP"
                    ))
            await db.commit()
            print("Default accounts seeded.")
        else:
            print("Database already seeded.")

    print("Bhuvigyan backend running on port 8000")
    yield
    await redis_client.close()

app = FastAPI(
    title="Bhuvigyan API",
    description="AI-Powered Crop Insurance & Carbon Credit Platform",
    version="7.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/farmer/login") or request.url.path.startswith("/api/v1/auth"):
            client_ip = request.client.host if request.client else "unknown"
            key = f"rate_limit:{client_ip}:{request.url.path}"
            current = await redis_client.get(key)
            if current and int(current) >= 5:
                return JSONResponse(status_code=429, content={"success": False, "error": {"message": "Too many requests. Please try again later."}})
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, 60)
            await pipe.execute()
        return await call_next(request)

app.add_middleware(RateLimitMiddleware)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(farmer_auth.router, prefix="/api/v1/farmer", tags=["Farmer Auth"])
# Inspector auth uses same login endpoint with role=field_inspector
app.include_router(farmer_data.router, prefix="/api/v1/farmer", tags=["Farmer Data"])
app.include_router(admin_auth.router, prefix="/api/v1/admin", tags=["Admin Auth"])
app.include_router(admin_data.router, prefix="/api/v1/admin", tags=["Admin Data"])
app.include_router(csc.router, prefix="/api/v1/csc", tags=["CSC"])
app.include_router(officer.router, prefix="/api/v1/officer", tags=["Field Officer"])
app.include_router(insurer.router, prefix="/api/v1/insurer", tags=["Insurer"])
app.include_router(state_dc.router, prefix="/api/v1/state", tags=["State/DC"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Locations"])
app.include_router(system.router, prefix="/api/v1/system", tags=["System"])
app.include_router(auth_refresh.router, tags=["Auth"])
app.include_router(claims.router, prefix="/api/v1/claims", tags=["Claims"])
app.include_router(state_adapters.router, prefix="/api/v1", tags=["State Adapters"])
app.include_router(model_registry.router, prefix="/api/v1", tags=["Model Registry"])
app.include_router(system_config.router, prefix="/api/v1", tags=["System Config"])
app.include_router(fraud_scoring.router, prefix="/api/v1", tags=["Fraud Scoring"])
app.include_router(evidence.router, prefix="/api/v1", tags=["Evidence"])
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications"])
app.include_router(reports.router, prefix="/api/v1", tags=["Reports"])
app.include_router(dossier.router, prefix="/api/v1", tags=["Dossier"])
app.include_router(state_claims.router, prefix="/api/v1", tags=["State Claims"])
app.include_router(inspector_auth.router, prefix="/api/v1/inspector/auth", tags=["Inspector Auth"])
app.include_router(inspector.router, prefix="/api/v1", tags=["Inspector"])
app.include_router(admin_inspector.router, prefix="/api/v1", tags=["Admin Inspector"])
app.include_router(payments.router, prefix="/api/v1", tags=["Payments"])
app.include_router(carbon_credits.router, prefix="/api/v1", tags=["Carbon Credits"])
app.include_router(farm_registrations.router, prefix="/api/v1", tags=["Farm Registrations"])
app.include_router(satellite.router, prefix="/api/v1", tags=["Satellite"])
app.include_router(land.router, prefix="/api/v1", tags=["Land"])
app.include_router(analysis.router, prefix="/api/v1", tags=["Unified Analysis"])
app.include_router(csc_portal.router, prefix="/api/v1/csc", tags=["CSC Portal"])
app.include_router(insurer_portal.router, prefix="/api/v1/insurer", tags=["Insurer Portal"])
app.include_router(farmer_insurance.router, prefix="/api/v1/farmer/insurance", tags=["Farmer Insurance"])
app.include_router(insurer_policies.router, prefix="/api/v1/insurer", tags=["Insurer Policies"])
app.include_router(my_land.router, prefix="/api/v1/my-land", tags=["my-land"])

@app.get("/health")
async def health():
    """Comprehensive health check for all external dependencies."""
    from app.database import engine
    from app.redis_client import redis_client
    from app.services import land_service
    from app.services.gee_init import GEE_INITIALIZED
    import httpx

    status = {
        "status": "UP",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "services": {}
    }

    # 1. Database
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        status["services"]["database"] = {"status": "UP", "detail": "PostgreSQL connected"}
    except Exception as e:
        status["services"]["database"] = {"status": "DOWN", "detail": str(e)}
        status["status"] = "DEGRADED"

    # 2. Redis
    try:
        await redis_client.ping()
        status["services"]["redis"] = {"status": "UP", "detail": "Redis connected"}
    except Exception as e:
        status["services"]["redis"] = {"status": "DOWN", "detail": str(e)}
        status["status"] = "DEGRADED"

    # 3. KGIS (lightweight probe)
    try:
        res = await land_service._try_all_bases("kgisadminhierarchy", {"deptcode": "01", "applncode": "0102", "code": "582101", "type": "kgis"}, timeout=8)
        if res["success"]:
            status["services"]["kgis"] = {"status": "UP", "detail": f"Reachable via {res.get('url', 'unknown')}"}
        else:
            status["services"]["kgis"] = {"status": "DEGRADED", "detail": res.get("error", "No response")}
            status["status"] = "DEGRADED"
    except Exception as e:
        status["services"]["kgis"] = {"status": "DOWN", "detail": str(e)}
        status["status"] = "DEGRADED"

    # 4. Bhoomi (lightweight probe — Karnataka-specific external, non-critical)
    try:
        res = await land_service._try_all_bases("getAllDistricts", headers=land_service.HEADERS_BHOOMI, bases=land_service.BHOOMI_BASES, timeout=8)
        if res["success"]:
            status["services"]["bhoomi"] = {"status": "UP", "detail": f"Reachable via {res.get('url', 'unknown')}"}
        else:
            status["services"]["bhoomi"] = {"status": "DEGRADED", "detail": res.get("error", "No response (KA-specific, non-critical)")}
            # Bhoomi is Karnataka-only — don't downgrade overall health
    except Exception as e:
        status["services"]["bhoomi"] = {"status": "DEGRADED", "detail": f"Unreachable (KA-specific, non-critical): {str(e)[:80]}"}

    # 5. GEE
    if GEE_INITIALIZED:
        status["services"]["gee"] = {"status": "UP", "detail": "Google Earth Engine initialized"}
    else:
        status["services"]["gee"] = {"status": "DOWN", "detail": "GEE not initialized (check .env GEE_PROJECT_ID or service account)"}
        status["status"] = "DEGRADED"

    return status


@app.get("/api/debug/test-flow")
async def debug_test_flow():
    """Debug endpoint that runs a known test case and returns exactly what each layer produced."""
    from app.services import land_service
    from app.services.satellite_service import SatelliteService
    from app.services.fraud_service import python_fallback_scorer
    from app.services.gee_init import GEE_INITIALIZED

    # Known test parameters (KGIS village ID for a real village)
    test_village_id = "582101"
    test_survey = "45"
    test_district = "Bengaluru Rural"
    test_taluk = "Devanahalli"
    test_hobli = "Doddaballapura"
    test_village = "Vijayapura"

    report = {
        "test_parameters": {
            "district": test_district,
            "taluk": test_taluk,
            "hobli": test_hobli,
            "village": test_village,
            "kgis_village_id": test_village_id,
            "survey_number": test_survey,
        },
        "steps": []
    }

    # Step 1: Bhoomi RTC
    rtc_result = {"status": "pending", "data": None, "error": None}
    try:
        rtc = await land_service.fetch_rtc(test_district, test_taluk, test_hobli, test_village, test_survey, "1")
        rtc_result["status"] = "success" if rtc.get("success") else "empty"
        rtc_result["data"] = rtc
        rtc_result["source"] = rtc.get("source", "unknown")
    except Exception as e:
        rtc_result["status"] = "error"
        rtc_result["error"] = str(e)
    report["steps"].append({"name": "Bhoomi RTC", **rtc_result})

    # Step 2: KGIS Admin Hierarchy
    admin_result = {"status": "pending", "data": None, "error": None}
    try:
        admin = await land_service.get_admin_hierarchy(test_village_id, "kgis")
        admin_result["status"] = "success" if admin.get("found") else "empty"
        admin_result["data"] = admin
    except Exception as e:
        admin_result["status"] = "error"
        admin_result["error"] = str(e)
    report["steps"].append({"name": "KGIS Admin Hierarchy", **admin_result})

    # Step 3: KGIS Polygon
    poly_result = {"status": "pending", "data": None, "error": None}
    try:
        poly = await land_service.get_survey_polygon(test_village_id, test_survey)
        poly_result["status"] = "success" if poly.get("found") else "empty"
        poly_result["data"] = poly
    except Exception as e:
        poly_result["status"] = "error"
        poly_result["error"] = str(e)
    report["steps"].append({"name": "KGIS Polygon", **poly_result})

    # Step 4: NDVI (mock if GEE unavailable)
    ndvi_result = {"status": "pending", "data": None, "error": None}
    try:
        sat = SatelliteService()
        lat, lng = 13.0, 77.5
        if poly_result["data"] and poly_result["data"].get("centroid_lat"):
            lat = poly_result["data"]["centroid_lat"]
            lng = poly_result["data"]["centroid_lng"]
        current = sat.get_ndvi_current(lat, lng, buffer_m=500)
        ndvi_result["status"] = "success"
        ndvi_result["data"] = current
        ndvi_result["gee_initialized"] = GEE_INITIALIZED
    except Exception as e:
        ndvi_result["status"] = "error"
        ndvi_result["error"] = str(e)
    report["steps"].append({"name": "NDVI (GEE)", **ndvi_result})

    # Step 5: Fraud Scoring
    fraud_result = {"status": "pending", "data": None, "error": None}
    try:
        features = {
            "ndviAtClaim": ndvi_result["data"].get("ndvi", 0.5) if ndvi_result["data"] else 0.5,
            "claimedAreaHa": rtc_result["data"].get("area_hectares", 0) if rtc_result["data"] else 0,
            "computedAreaHa": poly_result["data"].get("area_ha_computed", 0) if poly_result["data"] else 0,
            "declaredCrop": "PADDY",
            "isDuplicate": False,
            "rtcMutationDaysBefore": 999,
            "sarFloodConfirmed": False,
        }
        fraud = python_fallback_scorer(features)
        fraud_result["status"] = "success"
        fraud_result["data"] = fraud
    except Exception as e:
        fraud_result["status"] = "error"
        fraud_result["error"] = str(e)
    report["steps"].append({"name": "Fraud Scoring", **fraud_result})

    # Summary
    report["summary"] = {
        "total_steps": len(report["steps"]),
        "success_count": sum(1 for s in report["steps"] if s["status"] == "success"),
        "error_count": sum(1 for s in report["steps"] if s["status"] == "error"),
        "empty_count": sum(1 for s in report["steps"] if s["status"] == "empty"),
    }

    return report


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"message": exc.detail}}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"message": f"Internal server error: {str(exc)}"}}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)