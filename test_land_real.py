import httpx, json

r = httpx.post('http://127.0.0.1:8001/api/v1/land/satellite-analyze', json={
    'state': 'Maharashtra',
    'district': 'Sangli',
    'taluk': 'Tasgaon',
    'village': 'Sakharale',
    'survey_number': '42',
    'lat': 16.924381,
    'lng': 74.575982
}, timeout=60)
print('Status:', r.status_code)
d = r.json()
print('Source:', d.get('source'))
print('GEE Error:', d.get('geeError'))
data = d.get('data', {})
print('NDVI:', data.get('ndvi'))
print('CropType:', data.get('cropType'))
print('CropHealth:', data.get('cropHealth'))
print('NDVI History:', data.get('ndviHistory'))
print('Full keys:', list(data.keys())[:20])
