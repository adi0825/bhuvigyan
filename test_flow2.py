import httpx

BASE = 'http://127.0.0.1:8000/api/v1'

print("=== Full Data Flow Test ===")

# Step 1: Fetch satellite data (what LandPortal does)
print("\n1. Fetch satellite data...")
r = httpx.post(f'{BASE}/land/satellite-analyze', json={
    "state": "Maharashtra", "district": "Sangli", "taluk": "Tasgaon",
    "village": "Sakharale", "surveyNo": "42",
    "lat": 16.924381, "lng": 74.575982
}, timeout=30)
data = r.json()["data"]
print(f"   Crop: {data['cropType']}, Health: {data['cropHealth']}, NDVI: {data['ndvi']}")

# Step 2: Send to verify (what LandPortal does on button click)
print("\n2. Verify land data...")
r = httpx.post(f'{BASE}/land/verify', json=data, timeout=10)
verify = r.json()
print(f"   Verified: {verify['coordinatesVerified']}, ID: {verify['verificationId'][:8]}...")

# Step 3: Check if farmer login works for auth context
print("\n3. Check farmer auth...")
r = httpx.post(f'{BASE}/farmer/login', json={"mobile": "9876543210"}, timeout=10)
print(f"   Login status: {r.status_code}")

print("\n=== All steps completed successfully ===")
