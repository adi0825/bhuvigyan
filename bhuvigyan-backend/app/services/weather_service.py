"""
Bhuvigyan V7 — Weather Evidence Service
Retrieves and caches weather data from IMD / OpenWeatherMap.
"""
from datetime import date, datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.weather_satellite import WeatherCache
from app.redis_client import redis_client
import json
import httpx

WEATHER_CACHE_TTL = 86400  # 24 hours


async def get_weather(lat: float, lng: float, target_date: date, db: AsyncSession) -> Dict[str, Any]:
    """Fetch weather for a specific lat/lng/date. Uses cache first."""
    # Check DB cache
    result = await db.execute(
        select(WeatherCache)
        .where(
            WeatherCache.lat == lat,
            WeatherCache.lng == lng,
            WeatherCache.date == target_date,
        )
        .order_by(WeatherCache.cached_at.desc())
    )
    cached = result.scalar_one_or_none()
    if cached:
        return {
            "temperature": float(cached.temperature) if cached.temperature else None,
            "rainfall_mm": float(cached.rainfall_mm) if cached.rainfall_mm else None,
            "humidity": float(cached.humidity) if cached.humidity else None,
            "wind_speed": float(cached.wind_speed) if cached.wind_speed else None,
            "source": cached.source or "CACHE",
        }

    # Check Redis cache
    redis_key = f"weather:{lat:.4f}:{lng:.4f}:{target_date.isoformat()}"
    redis_val = await redis_client.get(redis_key)
    if redis_val:
        data = json.loads(redis_val)
        # Warm DB cache
        await _persist_weather_cache(lat, lng, target_date, data, db)
        return data

    # Fetch from external API (mock for MVP)
    data = await _fetch_weather_external(lat, lng, target_date)
    if data:
        await _persist_weather_cache(lat, lng, target_date, data, db)
        await redis_client.setex(redis_key, WEATHER_CACHE_TTL, json.dumps(data))
    return data


async def _fetch_weather_external(lat: float, lng: float, target_date: date) -> Dict[str, Any]:
    """External weather fetch. Returns mock data when API unavailable."""
    try:
        # Attempt OpenWeatherMap historical API
        api_key = "demo_key"
        timestamp = int(datetime.combine(target_date, datetime.min.time()).timestamp())
        url = f"https://api.openweathermap.org/data/3.0/onecall/timemachine?lat={lat}&lon={lng}&dt={timestamp}&appid={api_key}&units=metric"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                d = resp.json()
                hour = d.get("data", [{}])[0]
                return {
                    "temperature": hour.get("temp"),
                    "rainfall_mm": hour.get("rain", {}).get("1h", 0),
                    "humidity": hour.get("humidity"),
                    "wind_speed": hour.get("wind_speed"),
                    "source": "OPENWEATHERMAP",
                }
    except Exception:
        pass

    # Fallback: IMD mock data (season-aware)
    month = target_date.month
    if month in (6, 7, 8, 9):  # Monsoon
        return {"temperature": 28.5, "rainfall_mm": 45.0, "humidity": 0.85, "wind_speed": 12.0, "source": "IMD_MOCK"}
    elif month in (3, 4, 5):  # Summer
        return {"temperature": 38.5, "rainfall_mm": 2.0, "humidity": 0.35, "wind_speed": 8.0, "source": "IMD_MOCK"}
    else:
        return {"temperature": 22.0, "rainfall_mm": 5.0, "humidity": 0.55, "wind_speed": 6.0, "source": "IMD_MOCK"}


async def _persist_weather_cache(lat: float, lng: float, target_date: date, data: Dict[str, Any], db: AsyncSession):
    cache = WeatherCache(
        lat=lat,
        lng=lng,
        date=target_date,
        temperature=data.get("temperature"),
        rainfall_mm=data.get("rainfall_mm"),
        humidity=data.get("humidity"),
        wind_speed=data.get("wind_speed"),
        source=data.get("source"),
    )
    db.add(cache)
    await db.flush()
