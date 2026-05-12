"""
Bhuvigyan V7 — Pytest Configuration
"""
import pytest
import pytest_asyncio
import asyncio
from datetime import datetime
from uuid import uuid4
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.config import settings
from main import app

_TEST_ENGINE = None


def _get_test_engine():
    global _TEST_ENGINE
    if _TEST_ENGINE is None:
        _TEST_ENGINE = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            poolclass=None,  # Disable pooling for tests
        )
    return _TEST_ENGINE


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop after."""
    engine = _get_test_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Provide a transactional database session that rolls back after each test."""
    engine = _get_test_engine()
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Async HTTP test client with overridden DB dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient):
    """Register and login a test farmer, return Authorization headers."""
    # Register farmer
    await client.post("/api/v1/farmer/register", json={
        "fullName": "Test Farmer",
        "mobile": "9900000099"
    })
    # Login
    login_res = await client.post("/api/v1/farmer/login", json={"mobile": "9900000099"})
    otp = login_res.json()["data"]["devOtp"]
    # Verify OTP
    verify_res = await client.post("/api/v1/farmer/verify-otp", json={
        "mobile": "9900000099",
        "otp": otp
    })
    token = verify_res.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def admin_headers(client: AsyncClient):
    """Login as test admin, return Authorization headers."""
    login_res = await client.post("/api/v1/admin/login", json={
        "email": "superadmin@bhuvigyan.gov.in",
        "password": "admin123",
        "totpCode": "123456"
    })
    token = login_res.json()["data"]["accessToken"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_claim_data():
    """Return a valid claim payload for testing."""
    return {
        "policyId": str(uuid4()),
        "lossType": "DROUGHT",
        "lossDate": "2024-08-15",
        "affectedArea": 2.5,
        "claimAmount": 45000,
        "description": "Severe drought observed across entire insured plot. Crop completely dried.",
        "gpsLatitude": "20.6880",
        "gpsLongitude": "77.7210"
    }


@pytest.fixture
def genuine_low_risk_features():
    """Return features for a genuine low-risk claim (matches fraud_service.py keys)."""
    return {
        "ndviAtClaim": 0.28,
        "isDuplicate": False,
        "rtcMutationDaysBefore": 999,
        "sarFloodConfirmed": True,
        "claim_amount_ratio": 0.15,
        "geo_cluster_different_farmers": 1,
        "weather_mismatch": 0,
        "ndvi_mismatch": 0,
        "officer_loss_pct_diff": 2.0,
        "same_gps_3plus_claims": 0,
        "prior_fraud_flags": 0,
        "affected_area_ratio": 0.5,
    }


@pytest.fixture
def high_fraud_features():
    """Return features for a high-fraud claim (matches fraud_service.py keys)."""
    return {
        "ndviAtClaim": 0.68,
        "isDuplicate": True,
        "rtcMutationDaysBefore": 10,
        "sarFloodConfirmed": False,
        "claim_amount_ratio": 2.0,
        "geo_cluster_different_farmers": 3,
        "weather_mismatch": 1,
        "ndvi_mismatch": 1,
        "officer_loss_pct_diff": 20.0,
        "same_gps_3plus_claims": 1,
        "prior_fraud_flags": 2,
        "affected_area_ratio": 0.99,
    }
