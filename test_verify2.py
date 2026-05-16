import httpx, time

BASE = 'http://127.0.0.1:8001/api/v1'
HOLDING_ID = '2f84720f-2481-43ed-a098-a630cf0e4a0a'
FARMER_ID = 'test-farmer-e2e-3'

print('Verifying land...')
start = time.time()
r = httpx.post(f'{BASE}/my-land/verify-land', json={'land_holding_id': HOLDING_ID, 'farmer_id': FARMER_ID}, timeout=120)
print(f'Status: {r.status_code}, Time: {time.time()-start:.1f}s')
d = r.json()
if d.get('success'):
    data = d['data']
    print(f'Verification: {data["verification_status"]}')
    print(f'NDVI: {data.get("ndvi_mean")} ({data["ndvi_status"]})')
    print(f'Moisture: {data["soil_moisture"]}')
    print(f'Crop mix: {len(data["crop_mix"].get("crops", []))} crops')
    print(f'Confidence: {data["crop_mix"].get("confidence")}')
    print(f'Anomalies: {len(data.get("anomalies", []))}')
    print(f'Truth packet keys: {list(data.get("truth_packet", {}).keys())}')
    for step in data.get('pipeline_steps', []):
        print(f'  {step["step"]}: {step["status"]}')
else:
    print(f'Error: {d.get("error")}')
    for step in d.get('pipeline_steps', []):
        print(f'  {step["step"]}: {step["status"]} {step.get("message", "")}')
