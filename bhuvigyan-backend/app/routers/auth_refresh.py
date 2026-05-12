from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt_utils import decode_token, create_access_token, create_refresh_token

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

@router.post("/refresh")
async def refresh_token(body: dict):
    refresh_token = body.get("refreshToken")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="refreshToken required")
    try:
        payload = decode_token(refresh_token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")
    new_access = create_access_token({"userId": payload["userId"], "role": payload.get("role", "FARMER")})
    new_refresh = create_refresh_token({"userId": payload["userId"]})
    return {"success": True, "data": {"accessToken": new_access, "refreshToken": new_refresh}}
