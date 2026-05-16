"""Minimal cache wrapper using the existing redis client."""
import json
import hashlib
from typing import Any, Optional
from app.redis_client import redis_client


class CacheService:
    """Simple async Redis cache wrapper."""

    @staticmethod
    def make_key(*parts: str) -> str:
        raw = ":".join(parts)
        return "cache:" + hashlib.md5(raw.encode()).hexdigest()[:16]

    @staticmethod
    async def get(key: str) -> Optional[Any]:
        try:
            val = await redis_client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass
        return None

    @staticmethod
    async def set(key: str, value: Any, ttl: int = 3600) -> None:
        try:
            await redis_client.setex(key, ttl, json.dumps(value))
        except Exception:
            pass

    @staticmethod
    async def delete(key: str) -> None:
        try:
            await redis_client.delete(key)
        except Exception:
            pass
