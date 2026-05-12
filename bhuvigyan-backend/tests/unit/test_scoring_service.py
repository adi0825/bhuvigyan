"""
Bhuvigyan V7 — Unit Tests for Scoring Service (FRAUD-001, FRAUD-002)
"""
import pytest
from app.services.scoring_service import _get_risk_band, _generate_explanation
from app.services.fraud_service import python_fallback_scorer


class TestRiskBandRouting:
    """FR-025: Verify claims are routed to correct band based on score."""

    def test_low_risk_auto_approve(self):
        band, action = _get_risk_band(15)
        assert band == "LOW"
        assert action == "AUTO_APPROVED"

    def test_medium_risk_officer_review(self):
        band, action = _get_risk_band(35)
        assert band == "MEDIUM"
        assert action == "OFFICER_REVIEW"
        band, action = _get_risk_band(55)
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
        band, action = _get_risk_band(95)
        assert band == "CRITICAL"
        assert action == "AUTO_REJECTED"

    def test_boundary_low_medium(self):
        band, action = _get_risk_band(30)
        assert band == "LOW"

    def test_boundary_medium_high(self):
        band, action = _get_risk_band(60)
        assert band == "MEDIUM"

    def test_boundary_high_critical(self):
        band, action = _get_risk_band(80)
        assert band == "HIGH"


class TestPythonFallbackScorer:
    """FRAUD-001, FRAUD-002: Test python fallback scorer directly."""

    def test_genuine_low_risk_claim(self):
        features = {"ndviAtClaim": 0.28, "isDuplicate": False, "rtcMutationDaysBefore": 999, "sarFloodConfirmed": True}
        result = python_fallback_scorer(features)
        assert 0 <= result["fraudScore"] <= 30
        assert result["verdict"] == "AUTO_APPROVE"

    def test_high_fraud_claim(self):
        features = {"ndviAtClaim": 0.68, "isDuplicate": True, "rtcMutationDaysBefore": 10, "sarFloodConfirmed": False}
        result = python_fallback_scorer(features)
        assert result["fraudScore"] >= 80
        assert result["verdict"] == "AUTO_REJECT_FIR"
        assert any(s["key"] == "DUPLICATE" for s in result["signals"])

    def test_score_clamped_to_100(self):
        features = {"ndviAtClaim": 0.68, "isDuplicate": True, "rtcMutationDaysBefore": 10, "sarFloodConfirmed": False}
        result = python_fallback_scorer(features)
        assert 0 <= result["fraudScore"] <= 100


class TestExplanationGeneration:
    """FRAUD-006: SHAP-like explanation output validation."""

    def test_explanation_returns_top_factors(self):
        features = {"claim_amount_ratio": 2.0, "geo_cluster_different_farmers": 3, "weather_mismatch": 1, "ndvi_mismatch": 1, "officer_loss_pct_diff": 20, "same_gps_3plus_claims": 1, "prior_fraud_flags": 1, "affected_area_ratio": 0.99}
        exp = _generate_explanation(features, 75)
        assert "top_factors" in exp
        assert len(exp["top_factors"]) <= 5
        assert "shap_values" in exp
        assert "human_readable_text" in exp
        for f in exp["top_factors"]:
            assert "name" in f
            assert "weight" in f
            assert "direction" in f
