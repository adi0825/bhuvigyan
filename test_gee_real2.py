import httpx, time

BASE = 'http://127.0.0.1:8001/api/v1'
HOLDING_ID = '5a2b0b68-73b5-49af-95df-55323f109cd1'
FARMER_ID = 'test-real-001'

print('Verifying with REAL GEE satellite data...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={'land_holding_id': HOLDING_ID, 'farmer_id': FARMER_ID}, timeout=180)
print(f'Status: {r.status_code}, Time: {time.time()-start:.1f}s')

d = r.json()
if d.get('success'):
    data = d['data']
    print('Source:', data.get('source'))
    print('NDVI mean:', data.get('ndvi_mean'))
    print('NDVI status:', data['ndvi_status'])
    print('Scan date:', data.get('scan_date'))
    print('Radar fallback:', data.get('used_radar_fallback'))
    print('Zones:', len(data.get('zones', [])))
    for z in data.get('zones', []):
        print(f"  {z['zone_id']}: NDVI={z['ndvi_mean']}, {z['label']}, pixels={z['pixel_count']}")
    print('Crop mix confidence:', data['crop_mix'].get('confidence') if data.get('crop_mix') else 'N/A')
    print('SceneSummary:', data.get('sceneSummary'))
    print('Pipeline:')
    for step in data.get('pipeline_steps', []):
        print(f"  {step['step']}: {step['status']}")
    src = str(data.get('source', '')).lower()
    if 'mock' in src:
        print('WARNING: Source contains mock - data is not real!')
    else:
        print('SUCCESS: Real satellite data returned!')
else:
    print('Error:', d.get('error'))
    for step in d.get('pipeline_steps', []):
        print(f"  {step['step']}: {step['status']} {step.get('message', '')}")
