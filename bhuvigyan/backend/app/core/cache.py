import redis.asyncio as aioredis
import json
import hashlib
from typing import Any, Optional
from app.core.config import settings
from app.core.logging import logger


class CacheService:
    _client: Optional[aioredis.Redis] = None

    @classmethod
    async def get_client(cls) -> aioredis.Redis:
        if cls._client is None:
            cls._client = await aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return cls._client

    @classmethod
    def make_key(cls, *parts: str) -> str:
        raw = ":".join(str(p) for p in parts)
        return "bhuvigyan:" + hashlib.md5(
            raw.encode()
        ).hexdigest()

    @classmethod
    async def get(cls, key: str) -> Optional[Any]:
        try:
            client = await cls.get_client()
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception as e:
            logger.warning("cache_get_failed",
                           key=key, error=str(e))
        return None

    @classmethod
    async def set(
        cls, key: str, value: Any, ttl: int = 3600
    ) -> bool:
        try:
            client = await cls.get_client()
            await client.setex(
                key, ttl, json.dumps(value,
                default=str)
            )
            return True
        except Exception as e:
            logger.warning("cache_set_failed",
                           key=key, error=str(e))
        return False

    @classmethod
    async def delete(cls, key: str) -> None:
        try:
            client = await cls.get_client()
            await client.delete(key)
        except Exception:
            pass
