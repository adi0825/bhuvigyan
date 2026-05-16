import httpx

BASE = 'http://127.0.0.1:8000/api/v1'

print("=== Farmer Registration Test ===")

# Test farmer register (the one that had the NameError)
r = httpx.post(f'{BASE}/farmer/register', json={
    "fullName": "Test Farmer",
    "mobile": "9988776600",
    "aadhaar": "123456789012",
    "gender": "Male",
    "dob": "1990-01-01T00:00:00Z",
    "village": "Sakharale",
    "taluk": "Tasgaon",
    "district": "Sangli",
    "state_code": "MH",
    "pincode": "",
    "bank_name": "State Bank of India",
    "bank_ifsc": "SBIN0001234",
    "bank_account": "1234567890",
    "branch_name": "Tasgaon",
    "land_area": 3.5,
    "crop_name": "SUGARCANE",
    "landData": {
        "lat": 16.924381,
        "lng": 74.575982,
        "state": "Maharashtra",
        "district": "Sangli",
        "taluk": "Tasgaon",
        "village": "Sakharale",
        "surveyNo": "42",
        "ndvi": 0.78,
        "cropType": "Sugarcane",
        "cropHealth": "Healthy",
        "cropCoverage": 92,
        "soilMoisture": 68,
        "fraudScore": 8,
        "area": 3.5,
        "landUse": "Agricultural",
        "coordinatesVerified": True
    }
}, timeout=30)

print(f"Status: {r.status_code}")
d = r.json()
if r.status_code == 200:
    data = d.get("data", {})
    print(f"  farmerId: {data.get('farmerId')}")
    print(f"  udlrn: {data.get('udlrn')}")
    print(f"  devOtp: {data.get('devOtp')}")
    print(f"  registrationStatus: {data.get('registrationStatus')}")
    print("[PASS] Farmer registration works")
else:
    print(f"  Error: {d}")
    print("[FAIL] Farmer registration failed")
