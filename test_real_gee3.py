import httpx, time

BASE = 'http://127.0.0.1:8001/api/v1'

# Add holding
r = httpx.post(f'{BASE}/my-land/add-land-holding', json={
    'farmer_id': 'test-real-002',
    'state': 'Maharashtra', 'district': 'Sangli', 'taluk': 'Tasgaon', 'village': 'Sakharale',
    'survey_number': '42', 'land_area_acres': 8.64,
    'latitude': 16.924381, 'longitude': 74.575982,
    'declared_crop': 'Sugarcane', 'season': 'Rabi', 'has_multiple_crops': False
}, timeout=60)
print('Add status:', r.status_code)
d = r.json()
HOLDING_ID = d['data']['id']
print('Holding ID:', HOLDING_ID)

# Verify with real GEE
print('Verifying with REAL GEE satellite...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={
    'land_holding_id': HOLDING_ID, 'farmer_id': 'test-real-002'
}, timeout=180)
print('Verify status:', r.status_code, 'Time:', round(time.time()-start, 1), 's')

data = r.json()
if data.get('success'):
    d = data['data']
    print('Source:', d.get('source'))
    print('NDVI mean:', d.get('ndvi_mean'))
    print('NDVI status:', d['ndvi_status'])
    print('Scan date:', d.get('scan_date'))
    print('Radar fallback:', d.get('used_radar_fallback'))
    print('Zones:', len(d.get('zones', [])))
    for z in d.get('zones', []):
        print(f"  {z['zone_id']}: NDVI={z['ndvi_mean']}, {z['label']}, pixels={z['pixel_count']}")
    src = str(d.get('source', '')).lower()
    if 'mock' in src or 'simulated' in src:
        print('FAIL: Still using mock/simulated data!')
    else:
        print('SUCCESS: Real satellite data!')
else:
    print('Error:', data.get('error'))
    for step in data.get('pipeline_steps', []):
        print(f"  {step['step']}: {step['status']} {step.get('message', '')}")
