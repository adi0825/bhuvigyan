import httpx

BASE = 'http://127.0.0.1:8001/api/v1'

# Add holding
r = httpx.post(f'{BASE}/my-land/add-land-holding', json={
    'farmer_id': 'test-real-003',
    'state': 'Maharashtra', 'district': 'Sangli', 'taluk': 'Tasgaon', 'village': 'Sakharale',
    'survey_number': '43', 'land_area_acres': 8.64,
    'latitude': 16.924381, 'longitude': 74.575982,
    'declared_crop': 'Sugarcane', 'season': 'Rabi', 'has_multiple_crops': False
}, timeout=60)
d = r.json()
HOLDING_ID = d['data']['id']
print('Holding ID:', HOLDING_ID)

# Verify
r = httpx.post(f'{BASE}/my-land/verify-land', json={
    'land_holding_id': HOLDING_ID, 'farmer_id': 'test-real-003'
}, timeout=180)
d = r.json()

if d.get('success'):
    data = d['data']
    print('Source:', data.get('source'))
    print('Truth packet source:', data.get('truth_packet', {}).get('satellite_data', {}).get('source'))
    print('Scenes:', data.get('truth_packet', {}).get('satellite_data', {}).get('scenes_count'))
    print('NDVI mean:', data.get('ndvi_mean'))
    print('Verification status:', data.get('verification_status'))
    src = str(data.get('source', '')).lower()
    if 'mock' in src or 'simulated' in src:
        print('FAIL: Still mock!')
    else:
        print('SUCCESS: Real data!')
else:
    print('Error:', d.get('error'))
    for step in d.get('pipeline_steps', []):
        print(f"  {step['step']}: {step['status']} {step.get('message', '')}")
