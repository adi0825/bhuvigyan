import httpx, time

BASE = 'http://127.0.0.1:8001/api/v1'
FARMER_ID = 'test-farmer-real-001'

# 1. Add land holding
print('1. Add land holding...')
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
}, timeout=30)
d = r.json()
print(f"   Status: {r.status_code}, ID: {d['data']['id']}")
HOLDING_ID = d['data']['id']

# 2. Verify with real satellite
print('2. Verify with REAL satellite data (GEE)...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={
    'land_holding_id': HOLDING_ID,
    'farmer_id': FARMER_ID
}, timeout=180)
elapsed = time.time() - start
print(f"   Status: {r.status_code}, Time: {elapsed:.1f}s")

data = r.json()
if data.get('success'):
    d = data['data']
    print(f"   Source: {d.get('source')}")
    print(f"   NDVI mean: {d.get('ndvi_mean')}")
    print(f"   NDVI status: {d['ndvi_status']}")
    print(f"   Scan date: {d.get('scan_date')}")
    print(f"   Radar fallback: {d.get('used_radar_fallback')}")
    print(f"   Zones: {len(d.get('zones', []))}")
    for z in d.get('zones', []):
        print(f"     {z['zone_id']}: NDVI={z['ndvi_mean']}, {z['label']}, pixels={z['pixel_count']}")
    print(f"   Crop mix confidence: {d['crop_mix'].get('confidence') if d.get('crop_mix') else 'N/A'}")
    print(f"   SceneSummary: {d.get('sceneSummary')}")
    print(f"   Pipeline:")
    for step in d.get('pipeline_steps', []):
        print(f"     {step['step']}: {step['status']}")
    src = str(d.get('source', '')).lower()
    if 'mock' in src:
        print("\n   WARNING: Source contains 'mock' - data is not real!")
    else:
        print("\n   SUCCESS: Real satellite data returned!")
else:
    print(f"   Error: {data.get('error')}")
    for step in data.get('pipeline_steps', []):
        print(f"     {step['step']}: {step['status']} {step.get('message', '')}")
