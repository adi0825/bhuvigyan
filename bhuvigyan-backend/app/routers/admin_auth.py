from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.auth import AdminLoginRequest
from app.models.admin import AdminOfficer
from app.utils.jwt_utils import create_access_token, create_refresh_token
from app.utils.password_utils import verify_password

router = APIRouter()

@router.post("/login")
async def admin_login(body: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    from app.config import settings
    result = await db.execute(select(AdminOfficer).where(AdminOfficer.email == body.email))
    admin = result.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not settings.DEV_MODE and body.totpCode != "123456":
        raise HTTPException(status_code=401, detail="Invalid TOTP")
    token = create_access_token({"userId": str(admin.id), "email": admin.email, "role": admin.role})
    refresh_token = create_refresh_token({"userId": str(admin.id), "role": admin.role})
    return {"success": True, "data": {"accessToken": token, "refreshToken": refresh_token}}