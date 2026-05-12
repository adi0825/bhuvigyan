from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.jwt_utils import decode_token

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    return payload

async def get_current_farmer(user: dict = Depends(get_current_user)):
    if user.get("role") != "FARMER":
        raise HTTPException(403, "Farmer access only")
    return user

async def require_admin_role(user: dict = Depends(get_current_user)):
    allowed = ["ADMIN", "SUPER_ADMIN", "ANALYST"]
    if user.get("role") not in allowed:
        raise HTTPException(403, "Admin access only")
    return user

async def require_officer_role(user: dict = Depends(get_current_user)):
    allowed = ["FIELD_OFFICER", "FIELD_INSPECTOR", "DC", "DISTRICT_OFFICER"]
    if user.get("role") not in allowed:
        raise HTTPException(403, "Officer access only")
    return user

async def require_insurer_role(user: dict = Depends(get_current_user)):
    if user.get("role") != "INSURER":
        raise HTTPException(403, "Insurer access only")
    return user

async def require_state_role(user: dict = Depends(get_current_user)):
    allowed = ["STATE_HEAD", "DC", "DISTRICT_OFFICER", "ANALYST"]
    if user.get("role") not in allowed:
        raise HTTPException(403, "State/DC access only")
    return user

async def require_csc_role(user: dict = Depends(get_current_user)):
    if user.get("role") != "CSC_OPERATOR":
        raise HTTPException(403, "CSC access only")
    return user

def require_role(allowed_roles: list):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(403, f"Access denied. Required roles: {allowed_roles}")
        return user
    return role_checker