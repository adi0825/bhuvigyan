import httpx
import json

BASE = 'http://127.0.0.1:8000/api/v1'
FARMER_ID = 'test-farmer-001'

print("=== My Land E2E Test ===\n")

# 1. Village geocode
print("1. Village geocode...")
r = httpx.post(f'{BASE}/my-land/village-geocode', json={"village": "Sakharale"}, timeout=15)
print(f"   Status: {r.status_code}")
d = r.json()
print(f"   Found: {d['data'].get('found')}")
if d['data'].get('villages'):
    print(f"   First: {d['data']['villages'][0]['village_name']}")

# 2. Add land holding
print("\n2. Add land holding...")
r = httpx.post(f'{BASE}/my-land/add-land-holding', json={
    "farmer_id": FARMER_ID,
    "state": "Maharashtra",
    "district": "Sangli",
    "taluk": "Tasgaon",
    "village": "Sakharale",
    "survey_number": "42",
    "land_area_acres": 8.64,
    "land_area_hectares": 3.5,
    "latitude": 16.924381,
    "longitude": 74.575982,
    "declared_crop": "Sugarcane",
    "season": "Rabi",
    "has_multiple_crops": False
}, timeout=15)
print(f"   Status: {r.status_code}")
d = r.json()
holding_id = d['data']['id']
print(f"   Holding ID: {holding_id}")
print(f"   Label: {d['data']['label']}")

# 3. Get land holdings
print("\n3. Get land holdings...")
r = httpx.get(f'{BASE}/my-land/land-holdings/{FARMER_ID}', timeout=10)
print(f"   Status: {r.status_code}")
d = r.json()
print(f"   Count: {d['count']}")

# 4. Verify land with satellite
print("\n4. Verify land with satellite (this may take 30-60s)...")
r = httpx.post(f'{BASE}/my-land/verify-land', json={
    "land_holding_id": holding_id,
    "farmer_id": FARMER_ID
}, timeout=120)
print(f"   Status: {r.status_code}")
d = r.json()
if d.get('success'):
    data = d['data']
    print(f"   Verification status: {data['verification_status']}")
    print(f"   NDVI status: {data['ndvi_status']}")
    print(f"   NDVI mean: {data.get('ndvi_mean')}")
    print(f"   Soil moisture: {data['soil_moisture']}")
    print(f"   Crop mix crops: {len(data['crop_mix'].get('crops', []))}")
    print(f"   Anomalies: {len(data.get('anomalies', []))}")
    print(f"   Pipeline steps: {len(data.get('pipeline_steps', []))}")
    print(f"   Truth packet keys: {list(data.get('truth_packet', {}).keys())}")
else:
    print(f"   Error: {d.get('error')}")
    print(f"   Pipeline steps: {d.get('pipeline_steps', [])}")

# 5. Get truth packet
print("\n5. Get truth packet...")
r = httpx.get(f'{BASE}/my-land/truth-packet/{holding_id}', timeout=10)
print(f"   Status: {r.status_code}")
if r.status_code == 200:
    d = r.json()
    text = d['data']['text'][:200]
    print(f"   Text preview: {text}...")

print("\n=== Test completed ===")
