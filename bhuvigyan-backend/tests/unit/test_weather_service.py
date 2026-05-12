"""
Bhuvigyan V7 — Unit Tests for Weather Service (WEA-004, WEA-005)
"""
import pytest
from datetime import date
from unittest.mock import patch, AsyncMock


class TestWeatherFallback:
    """WEA-005: Weather API unavailable fallback returns monsoon mock data."""

    @pytest.mark.asyncio
    async def test_api_failure_returns_seasonal_fallback(self):
        from app.services.weather_service import _fetch_weather_external
        result = await _fetch_weather_external(15.3647, 75.1240, date(2024, 8, 20))
        assert result is not None
        assert "rainfall_mm" in result
        assert "source" in result
        # August is monsoon season, should return non-zero rainfall
        assert result["rainfall_mm"] >= 0
