import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

async def init_redis():
    await redis_client.ping()
    return redis_client

async def close_redis():
    await redis_client.close()