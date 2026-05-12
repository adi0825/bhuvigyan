"""
Bhuvigyan V7 — Integration Tests for Fraud Scoring Pipeline (FRAUD-004 to FRAUD-010)
"""
import pytest
import subprocess
import json
import os
from uuid import uuid4
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select

from app.models.claim import Claim
from app.models.fraud_scoring import FraudScore
from app.services.scoring_service import score_claim, _get_risk_band


class TestScoringPipeline:
    """FRAUD-004 to FRAUD-006: Scoring pipeline integration."""

    @pytest.mark.asyncio
    async def test_scoring_pipeline_produces_score_and_risk_level(self, db_session):
        """FR-024: Score claim and produce risk level."""
        db = db_session
        claim = Claim(
            id=uuid4(),
            claim_number="TEST-001",
            udlrn="UDLRN-TEST-001",
            farmer_id=uuid4(),
            status="SUBMITTED",
            declared_crop="Rice",
            claimed_area_ha=Decimal("5.0"),
            season="KHARIF",
            year=2026,
            loss_type="DROUGHT",
            loss_date=date(2026, 3, 15),
            affected_area=Decimal("2.5"),
            claim_amount_requested=Decimal("50000"),
            description="Test claim for integration testing",
            filed_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(claim)
        await db.commit()

        result = await score_claim(str(claim.id), db, use_cpp=False)
        assert result["success"] is True
        data = result["data"]
        assert "score" in data
        assert "risk_level" in data
        assert 0 <= data["score"] <= 100
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    @pytest.mark.asyncio
    async def test_scoring_persists_fraud_score(self, db_session):
        """FR-024: Verify fraud score is persisted to database."""
        db = db_session
        claim = Claim(
            id=uuid4(),
            claim_number="TEST-002",
            udlrn="UDLRN-TEST-002",
            farmer_id=uuid4(),
            status="SUBMITTED",
            declared_crop="Wheat",
            claimed_area_ha=Decimal("3.0"),
            season="RABI",
            year=2026,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(claim)
        await db.commit()

        await score_claim(str(claim.id), db, use_cpp=False)
        result = await db.execute(select(Claim).where(Claim.id == claim.id))
        updated_claim = result.scalar_one()
        assert updated_claim.fraud_score is not None
        assert updated_claim.fraud_score >= 0

        fs_result = await db.execute(select(FraudScore).where(FraudScore.claim_id == claim.id))
        fraud_score = fs_result.scalar_one_or_none()
        assert fraud_score is not None


class TestRiskBandRouting:
    """FR-025: Verify claims are routed to correct band based on score."""

    def test_risk_band_mapping(self):
        assert _get_risk_band(15) == ("LOW", "AUTO_APPROVED")
        assert _get_risk_band(35) == ("MEDIUM", "OFFICER_REVIEW")
        assert _get_risk_band(55) == ("MEDIUM", "OFFICER_REVIEW")
        assert _get_risk_band(70) == ("HIGH", "CCE_VISIT")
        assert _get_risk_band(85) == ("CRITICAL", "AUTO_REJECTED")
        assert _get_risk_band(95) == ("CRITICAL", "AUTO_REJECTED")


class TestCppEngineIntegration:
    """FRAUD-004: C++ engine binary integration test."""

    def test_cpp_binary_exists(self):
        binary_path = os.path.join(os.getcwd(), "fraud_engine", "fraud_engine.exe")
        if os.name != 'nt':
            binary_path = os.path.join(os.getcwd(), "fraud_engine", "fraud_engine")
        if not os.path.exists(binary_path):
            pytest.skip("C++ binary not compiled")
        assert True

    def test_cpp_process_exits_zero(self, genuine_low_risk_features):
        binary_path = os.path.join(os.getcwd(), "fraud_engine", "fraud_engine.exe")
        if os.name != 'nt':
            binary_path = os.path.join(os.getcwd(), "fraud_engine", "fraud_engine")
        if not os.path.exists(binary_path):
            pytest.skip("C++ binary not compiled")

        input_json = json.dumps(genuine_low_risk_features)
        result = subprocess.run(
            [binary_path],
            input=input_json,
            capture_output=True,
            text=True,
            timeout=5
        )
        assert result.returncode == 0, f"C++ engine error: {result.stderr}"
        output = json.loads(result.stdout)
        assert 0 <= output.get("fraudScore", 0) <= 100


class TestPythonFallback:
    """FRAUD-005: Python fallback scorer when C++ engine unavailable."""

    def test_fallback_produces_valid_score(self, genuine_low_risk_features):
        from app.services.fraud_service import python_fallback_scorer
        result = python_fallback_scorer(genuine_low_risk_features)
        assert 0 <= result["fraudScore"] <= 100
        assert "verdict" in result


class TestShapExplainability:
    """FRAUD-006: SHAP explainability output validation."""

    def test_explanation_returns_top_factors(self, high_fraud_features):
        from app.services.scoring_service import _generate_explanation
        exp = _generate_explanation(high_fraud_features, 75)
        assert "top_factors" in exp
        assert len(exp["top_factors"]) <= 5
        assert "shap_values" in exp
        assert "human_readable_text" in exp
