"""
Bhuvigyan V7 — Unit Tests for State Adapter (ADAPT-004, ADAPT-005)
"""
import pytest
from app.services.state_adapter_service import DEFAULT_ADAPTER


class TestDefaultAdapterFallback:
    """ADAPT-004: Unknown state → default adapter loaded."""

    def test_default_adapter_has_expected_keys(self):
        assert DEFAULT_ADAPTER["state_code"] == "DEFAULT"
        assert DEFAULT_ADAPTER["ndvi_threshold"] == 0.15
        assert DEFAULT_ADAPTER["min_photos"] == 1

    def test_default_adapter_routing_rules(self):
        assert "routing_rules" in DEFAULT_ADAPTER
        assert "auto_approve" in DEFAULT_ADAPTER["routing_rules"]
