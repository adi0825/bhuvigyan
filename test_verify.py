import httpx

BASE = 'http://127.0.0.1:8000/api/v1'
FARMER_ID = 'test-farmer-001'
HOLDING_ID = '0c0227ae-8e5d-451f-8d2e-786ef8017285'

print('=== Verify Land with Satellite ===')
print('(This may take 60-120 seconds)...')

r = httpx.post(f'{BASE}/my-land/verify-land', json={
    'land_holding_id': HOLDING_ID,
    'farmer_id': FARMER_ID
}, timeout=120)

print(f'Status: {r.status_code}')
d = r.json()

if d.get('success'):
    data = d['data']
    print(f'Verification status: {data["verification_status"]}')
    print(f'NDVI status: {data["ndvi_status"]}')
    print(f'NDVI mean: {data.get("ndvi_mean")}')
    print(f'Soil moisture: {data["soil_moisture"]}')
    print(f'Crop mix crops: {len(data["crop_mix"].get("crops", []))}')
    print(f'Anomalies: {len(data.get("anomalies", []))}')
    print(f'Pipeline steps:')
    for step in data.get('pipeline_steps', []):
        print(f'  {step["step"]}: {step["status"]}')
    print(f'Truth packet keys: {list(data.get("truth_packet", {}).keys())}')
else:
    print(f'Error: {d.get("error")}')
    print(f'Pipeline steps:')
    for step in d.get('pipeline_steps', []):
        print(f'  {step["step"]}: {step["status"]} {step.get("message", "")}')
