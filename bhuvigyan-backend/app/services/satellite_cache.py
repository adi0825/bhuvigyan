import os
import json
import hashlib
from decimal import Decimal
from app.redis_client import redis_client


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


class SatelliteCache:
    TTL_FARM = int(os.getenv("SAT_CACHE_TTL_FARM", 21600))        # 6 hours
    TTL_REGION = int(os.getenv("SAT_CACHE_TTL_REGION", 43200))   # 12 hours
    TTL_TIMESERIES = int(os.getenv("SAT_CACHE_TTL_TIMESERIES", 86400))  # 24 hours

    def _key(self, prefix, *args):
        raw = f"{prefix}:{':'.join(str(a) for a in args)}"
        return hashlib.md5(raw.encode()).hexdigest()

    async def get(self, prefix, *args):
        key = self._key(prefix, *args)
        data = await redis_client.get(key)
        if data:
            result = json.loads(data)
            result["cached"] = True
            return result
        return None

    async def set(self, prefix, value, ttl, *args):
        key = self._key(prefix, *args)
        await redis_client.setex(key, ttl, json.dumps(value, cls=DecimalEncoder))

    async def delete_pattern(self, pattern):
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
        return len(keys)


satellite_cache = SatelliteCache()
