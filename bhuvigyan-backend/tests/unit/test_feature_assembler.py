"""
Bhuvigyan V7 — Unit Tests for Scoring Service Pure Functions (FRAUD-003)
"""
import pytest
from app.services.scoring_service import _get_risk_band, _clamp_score


class TestRiskBandPure:
    """FRAUD-003: Risk band routing logic."""

    def test_low_risk_auto_approve(self):
        band, action = _get_risk_band(15)
        assert band == "LOW"
        assert action == "AUTO_APPROVED"

    def test_medium_risk_officer_review(self):
        band, action = _get_risk_band(35)
        assert band == "MEDIUM"
        assert action == "OFFICER_REVIEW"

    def test_high_risk_cce_visit(self):
        band, action = _get_risk_band(70)
        assert band == "HIGH"
        assert action == "CCE_VISIT"

    def test_critical_risk_auto_reject(self):
        band, action = _get_risk_band(85)
        assert band == "CRITICAL"
        assert action == "AUTO_REJECTED"

    def test_clamp_score_bounds(self):
        assert _clamp_score(-10) == 0.0
        assert _clamp_score(50) == 50.0
        assert _clamp_score(110) == 100.0

    def test_clamp_score_float(self):
        assert _clamp_score(45.7) == pytest.approx(45.7)
