import subprocess, json
from app.config import settings

async def compute_fraud_score(claim_features: dict) -> dict:
    try:
        result = subprocess.run(
            [settings.FRAUD_ENGINE_PATH],
            input=json.dumps(claim_features),
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            raise Exception(f"Fraud engine error: {result.stderr}")
        return json.loads(result.stdout)
    except Exception:
        return python_fallback_scorer(claim_features)

def python_fallback_scorer(features: dict) -> dict:
    score = 0
    signals = []
    ndvi = features.get("ndviAtClaim", 0.5)
    if ndvi > 0.6:
        score += 35
        signals.append({"key": "NDVI_HEALTHY", "label": f"NDVI {ndvi:.2f} - healthy crop, damage claimed", "severity": "HIGH", "confidence": 0.85})
    if features.get("isDuplicate"):
        score += 50
        signals.append({"key": "DUPLICATE", "severity": "CRITICAL", "confidence": 1.0, "label": "Duplicate claim detected"})
    rtc_days = features.get("rtcMutationDaysBefore", 999)
    if rtc_days < 15:
        score += 40
        signals.append({"key": "RTC_MUTATION", "label": f"RTC changed {rtc_days} days before claim", "severity": "CRITICAL", "confidence": 0.95})
    if features.get("sarFloodConfirmed"):
        score -= 15

    # ── Inspector v2 factors (Part 8 of Agent.md) ──
    if features.get("inspector_report_available"):
        actual_loss = features.get("inspector_loss_pct", 0) or 0
        claimed_loss = features.get("claimed_loss_pct", 0) or 0
        discrepancy = abs(claimed_loss - actual_loss)

        if discrepancy > 30:
            score += 20
            signals.append({"key": "INSPECTOR_DISCREPANCY_HIGH", "label": f"Inspector loss {actual_loss}% vs claimed {claimed_loss}% (>{30}% diff)", "severity": "HIGH", "confidence": 0.9})
        elif discrepancy > 20:
            score += 12
            signals.append({"key": "INSPECTOR_DISCREPANCY_MED", "label": f"Inspector loss discrepancy {discrepancy:.0f}%", "severity": "MEDIUM", "confidence": 0.8})
        elif discrepancy > 10:
            score += 5
        else:
            score -= 10
            signals.append({"key": "INSPECTOR_CONFIRMS", "label": "Inspector confirms claim accuracy", "severity": "LOW", "confidence": 0.9})

        if not features.get("crop_found", True):
            score += 35
            signals.append({"key": "CROP_NOT_FOUND", "label": "Inspector: claimed crop not found", "severity": "CRITICAL", "confidence": 0.95})

        if not features.get("land_found", True):
            score += 40
            signals.append({"key": "LAND_NOT_FOUND", "label": "Inspector: no farmland at location", "severity": "CRITICAL", "confidence": 0.98})

        if not features.get("gps_verified", True):
            score += 8
            signals.append({"key": "GPS_NOT_VERIFIED", "label": "Inspector GPS not verified at farm", "severity": "MEDIUM", "confidence": 0.7})

        if features.get("satellite_inspector_agreement"):
            score -= 15
            signals.append({"key": "SAT_INSPECTOR_AGREE", "label": "Satellite and inspector findings agree", "severity": "LOW", "confidence": 0.85})

        if features.get("fraud_suspicion_by_inspector"):
            score += 25
            signals.append({"key": "INSPECTOR_FRAUD_SUSPICION", "label": "Inspector suspects fraud", "severity": "HIGH", "confidence": 0.8})

        visit_duration = features.get("visit_duration_minutes", 0) or 0
        if visit_duration < 20 and visit_duration > 0:
            score += 10
            signals.append({"key": "VISIT_TOO_FAST", "label": f"Visit completed in {visit_duration}min (suspicious)", "severity": "MEDIUM", "confidence": 0.7})

        if features.get("gps_photo_verified") and (features.get("photo_count", 0) or 0) >= 5:
            score -= 5

    score = max(0, min(100, score))
    if score <= 30: verdict = "AUTO_APPROVE"
    elif score <= 60: verdict = "OFFICER_REVIEW"
    elif score <= 80: verdict = "MANDATORY_VISIT"
    else: verdict = "AUTO_REJECT_FIR"

    result = {"fraudScore": score, "verdict": verdict, "signals": signals, "features": {}}
    if features.get("inspector_report_available"):
        result["inspection_version"] = "v2_with_inspector"
        result["inspector_agreement"] = features.get("satellite_inspector_agreement", False)
    return result