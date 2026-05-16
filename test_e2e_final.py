import httpx
import time

BASE = 'http://127.0.0.1:8001/api/v1'
FARMER_ID = 'test-farmer-e2e'

# 1. Village geocode
print('1. Village geocode...')
r = httpx.post(f'{BASE}/my-land/village-geocode', json={'village': 'Sakharale'}, timeout=15)
print(f'   Status: {r.status_code}, Found: {r.json()["data"].get("found")}')

# 2. Add land holding
print('2. Add land holding...')
r = httpx.post(f'{BASE}/my-land/add-land-holding', json={
    'farmer_id': FARMER_ID,
    'state': 'Maharashtra',
    'district': 'Sangli',
    'taluk': 'Tasgaon',
    'village': 'Sakharale',
    'survey_number': '42',
    'land_area_acres': 8.64,
    'land_area_hectares': 3.5,
    'latitude': 16.924381,
    'longitude': 74.575982,
    'declared_crop': 'Sugarcane',
    'season': 'Rabi',
    'has_multiple_crops': False
}, timeout=15)
d = r.json()
print(f'   Status: {r.status_code}, ID: {d["data"]["id"]}, Label: {d["data"]["label"]}')
HOLDING_ID = d['data']['id']

# 3. Verify land with satellite
print('3. Verify land with satellite (this may take 60-120s)...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={
    'land_holding_id': HOLDING_ID,
    'farmer_id': FARMER_ID
}, timeout=120)
elapsed = time.time() - start
print(f'   Status: {r.status_code}, Time: {elapsed:.1f}s')
vd = r.json()
if vd.get('success'):
    data = vd['data']
    print(f'   Verification status: {data["verification_status"]}')
    print(f'   NDVI status: {data["ndvi_status"]} (mean: {data.get("ndvi_mean")})')
    print(f'   Soil moisture: {data["soil_moisture"]}')
    print(f'   Crop mix: {len(data["crop_mix"].get("crops", []))} crops, confidence: {data["crop_mix"].get("confidence")}')
    print(f'   Anomalies: {len(data.get("anomalies", []))}')
    print(f'   Truth packet keys: {list(data.get("truth_packet", {}).keys())}')
    print(f'   Pipeline steps:')
    for step in data.get('pipeline_steps', []):
        print(f'     {step["step"]}: {step["status"]}')
else:
    print(f'   Error: {vd.get("error")}')
    for step in vd.get('pipeline_steps', []):
        print(f'     {step["step"]}: {step["status"]} {step.get("message", "")}')

# 4. Truth packet download
print('4. Truth packet download...')
r = httpx.get(f'{BASE}/my-land/truth-packet/{HOLDING_ID}', timeout=15)
print(f'   Status: {r.status_code}')
if r.status_code == 200:
    tp = r.json().get('data', {})
    print(f'   Text length: {len(tp.get("text", ""))} chars')

print('\\n=== ALL TESTS PASSED ===' if vd.get('success') else '\\n=== SOME TESTS FAILED ===')
