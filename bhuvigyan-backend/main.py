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
    satellite
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

@app.get("/health")
async def health():
    return {"status": "UP", "timestamp": datetime.utcnow().isoformat() + "Z"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"message": exc.detail}}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": {"message": "Internal server error"}}
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)