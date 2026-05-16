import httpx

BASE = 'http://127.0.0.1:8000/api/v1'

# 1. Village geocode
print('1. Village geocode...')
r = httpx.post(f'{BASE}/my-land/village-geocode', json={'village': 'Sakharale'}, timeout=15)
print(f'   Status: {r.status_code}')
print(f'   Found: {r.json()["data"].get("found")}')

# 2. Add land holding
print('2. Add land holding...')
r = httpx.post(f'{BASE}/my-land/add-land-holding', json={
    'farmer_id': 'test-farmer-001',
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
print(f'   Status: {r.status_code}')
if r.status_code == 200:
    d = r.json()
    print(f'   ID: {d["data"]["id"]}')
    print(f'   Label: {d["data"]["label"]}')
else:
    print(f'   Error: {r.text[:200]}')
