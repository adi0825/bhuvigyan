from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.config import settings
from fastapi import HTTPException

def create_access_token(payload: dict) -> str:
    if isinstance(payload, dict):
        data = payload.copy()
    else:
        data = {}
    data["exp"] = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    data["iat"] = datetime.utcnow()
    data["type"] = "access"
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_farmer_token(user_id: str, mobile: str = None, **kwargs) -> str:
    payload = {"userId": user_id, "role": "FARMER", "mobile": mobile}
    return create_access_token(payload)

def create_admin_token(user_id: str, email: str = None, role: str = "ADMIN", **kwargs) -> str:
    payload = {"userId": user_id, "email": email, "role": role}
    return create_access_token(payload)

def create_officer_token(user_id: str, email: str = None, role: str = "FIELD_OFFICER", **kwargs) -> str:
    payload = {"userId": user_id, "email": email, "role": role}
    return create_access_token(payload)

def create_insurer_token(user_id: str, email: str = None, **kwargs) -> str:
    payload = {"userId": user_id, "email": email, "role": "INSURER"}
    return create_access_token(payload)

def create_state_token(user_id: str, email: str = None, role: str = "DC", **kwargs) -> str:
    payload = {"userId": user_id, "email": email, "role": role}
    return create_access_token(payload)

def create_csc_token(user_id: str, csc_id: str = None, **kwargs) -> str:
    payload = {"userId": user_id, "cscId": csc_id, "role": "CSC_OPERATOR"}
    return create_access_token(payload)

def create_refresh_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    data["iat"] = datetime.utcnow()
    data["type"] = "refresh"
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")