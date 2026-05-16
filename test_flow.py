import httpx
import json

BASE = 'http://127.0.0.1:8000'
errors = []
passes = []

def check(name, condition, detail=""):
    if condition:
        passes.append(name)
        print(f"[PASS] {name}")
    else:
        errors.append(name)
        print(f"[FAIL] {name}: {detail}")

# 1. Health check
print("=== Health Check ===")
try:
    r = httpx.get(f'{BASE}/health', timeout=10)
    check("Health endpoint responds", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        check("Health status UP", d.get("status") == "UP")
        for svc, info in d.get("services", {}).items():
            # Bhoomi is Karnataka-only external — DEGRADED is acceptable
            if svc == "bhoomi":
                check(f"Service {svc} (non-critical)", info.get("status") in ("UP", "DEGRADED"), info.get("detail"))
            else:
                check(f"Service {svc}", info.get("status") == "UP", info.get("detail"))
except Exception as e:
    check("Health endpoint", False, str(e))

# 2. Satellite analyze - sugarcane demo
print("\n=== Satellite Analyze (Sugarcane Demo) ===")
try:
    r = httpx.post(f'{BASE}/api/v1/land/satellite-analyze', json={
        "state": "Maharashtra", "district": "Sangli", "taluk": "Tasgaon",
        "village": "Sakharale", "surveyNo": "42",
        "lat": 16.924381, "lng": 74.575982
    }, timeout=30)
    check("Satellite analyze responds", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        data = d.get("data", {})
        check("CropType is Sugarcane", data.get("cropType") == "Sugarcane", data.get("cropType"))
        check("CropHealth is Healthy", data.get("cropHealth") == "Healthy", data.get("cropHealth"))
        check("NDVI is 0.78", data.get("ndvi") == 0.78, data.get("ndvi"))
        check("CoordinatesVerified is True", data.get("coordinatesVerified") is True, data.get("coordinatesVerified"))
        check("FraudScore is low", data.get("fraudScore") == 8, data.get("fraudScore"))
        check("CropCoverage is 92", data.get("cropCoverage") == 92, data.get("cropCoverage"))
        check("SoilMoisture is 68", data.get("soilMoisture") == 68, data.get("soilMoisture"))
except Exception as e:
    check("Satellite analyze", False, str(e))

# 3. Land verify endpoint
print("\n=== Land Verify ===")
try:
    r = httpx.post(f'{BASE}/api/v1/land/verify', json={
        "lat": 16.924381, "lng": 74.575982,
        "landUse": "Agricultural", "ndvi": 0.78, "area": 3.5
    }, timeout=10)
    check("Land verify responds", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        d = r.json()
        check("Verify success=True", d.get("success") is True, d.get("success"))
        check("Verify coordinatesVerified=True", d.get("coordinatesVerified") is True, d.get("coordinatesVerified"))
except Exception as e:
    check("Land verify", False, str(e))

# 4. Test with wrong landUse
print("\n=== Negative Test (Non-Agricultural) ===")
try:
    r = httpx.post(f'{BASE}/api/v1/land/verify', json={
        "lat": 16.924381, "lng": 74.575982,
        "landUse": "Commercial", "ndvi": 0.78, "area": 3.5
    }, timeout=10)
    check("Non-agricultural rejected", r.status_code == 422, f"status={r.status_code}")
except Exception as e:
    check("Non-agricultural test", False, str(e))

# Summary
print(f"\n=== SUMMARY ===")
print(f"Passed: {len(passes)}")
print(f"Failed: {len(errors)}")
if errors:
    print(f"Errors: {', '.join(errors)}")
