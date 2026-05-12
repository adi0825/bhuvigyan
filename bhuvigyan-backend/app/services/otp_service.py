import random
from typing import Optional
from app.redis_client import redis_client
from app.config import settings

async def generate_otp(mobile: str) -> str:
    if settings.DEV_MODE:
        return settings.DEV_OTP
    otp = str(random.randint(100000, 999999))
    await redis_client.setex(f"otp:{mobile}", 300, otp)
    return otp

async def verify_otp(mobile: str, otp: str) -> bool:
    if settings.DEV_MODE:
        return otp == settings.DEV_OTP
    stored_otp = await redis_client.get(f"otp:{mobile}")
    if stored_otp and stored_otp == otp:
        await redis_client.delete(f"otp:{mobile}")
        return True
    return False

async def store_otp_session(mobile: str, session_data: dict) -> bool:
    import json
    await redis_client.setex(f"session:{mobile}", 3600, json.dumps(session_data))
    return True

async def get_otp_session(mobile: str) -> Optional[dict]:
    import json
    session_data = await redis_client.get(f"session:{mobile}")
    if session_data:
        return json.loads(session_data)
    return None