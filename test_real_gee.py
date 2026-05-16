import httpx, time

BASE = 'http://127.0.0.1:8001/api/v1'
HOLDING_ID = '2f84720f-2481-43ed-a098-a630cf0e4a0a'
FARMER_ID = 'test-farmer-e2e-3'

print('Verifying with REAL satellite data...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={'land_holding_id': HOLDING_ID, 'farmer_id': FARMER_ID}, timeout=180)
elapsed = time.time() - start
print(f'Status: {r.status_code}, Time: {elapsed:.1f}s')
d = r.json()
if d.get('success'):
    data = d['data']
    print(f"Source: {data.get('source')}")
    print(f"NDVI mean: {data.get('ndvi_mean')}")
    print(f"NDVI status: {data['ndvi_status']}")
    print(f"SceneSummary: {data.get('sceneSummary')}")
    print(f"Zones: {len(data.get('zones', []))}")
    for z in data.get('zones', []):
        print(f"  {z['zone_id']}: NDVI={z['ndvi_mean']}, {z['label']}, pixels={z['pixel_count']}")
else:
    print(f"Error: {d.get('error')}")
    for step in d.get('pipeline_steps', []):
        print(f"  {step['step']}: {step['status']} {step.get('message', '')}")
