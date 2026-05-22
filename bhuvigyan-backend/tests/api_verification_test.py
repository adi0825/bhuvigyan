import os
import requests
import json
import ee
from datetime import datetime

# Credentials
BHUVAN_API_KEY = os.getenv("BHUVAN_API_KEY", "d079c826eed3ad22c3e6c140cb74b83802133292")
BHOONIDHI_USERNAME = os.getenv("BHOONIDHI_USERNAME", "")
BHOONIDHI_PASSWORD = os.getenv("BHOONIDHI_PASSWORD", "")
NOMINATIM_USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "bhuvigyan-fraud-detection/1.0")
GEE_PROJECT_ID = os.getenv("GEE_PROJECT_ID", "agri-494914")

LAT = 17.924381
LON = 74.57982

print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("PART 1: LIVE API VERIFICATION")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

# TEST 1: Bhuvan Reverse Geocoding
print("─── TEST 1: BHUVAN — Village Reverse Geocoding ───")
try:
    url = f"https://bhuvan-app1.nrsc.gov.in/api/2.0/rest/1/geocode/bhuvanrevgeocode"
    headers = {"X-BHUVAN-API-KEY": BHUVAN_API_KEY} if BHUVAN_API_KEY else {}
    params = {"lat": LAT, "lon": LON}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    
    village_name = None
    if response.status_code == 200:
        data = response.json()
        print(f"PASS ✅ Bhuvan Responded: {data}")
        # Extract village name from response if possible
        # Assume data might have 'village' or similar, let's just log it and fallback if no name found
    else:
        print(f"FAIL ❌ Bhuvan returned {response.status_code}: {response.text}")
        print("BHUVAN NEEDS KEY or is down.")
        raise Exception("Bhuvan Failed")
except Exception as e:
    print(f"Switching to Nominatim fallback...")
    url = f"https://nominatim.openstreetmap.org/reverse?lat={LAT}&lon={LON}&format=json"
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        village_name = data.get("address", {}).get("village") or data.get("address", {}).get("town") or "Unknown"
        print(f"PASS ✅ Nominatim fallback worked. Village: {village_name}")
    except Exception as e2:
        print(f"FAIL ❌ Nominatim fallback also failed: {e2}")
print()

# TEST 2: Bhuvan Village Geocoding
print("─── TEST 2: BHUVAN — Village Geocoding ───")
search_place = village_name if village_name and village_name != "Unknown" else "Solapur"
try:
    url = "https://bhuvan-app1.nrsc.gov.in/api/2.0/rest/1/geocode/bhuvangeocoding"
    headers = {"X-BHUVAN-API-KEY": BHUVAN_API_KEY} if BHUVAN_API_KEY else {}
    params = {"placename": search_place}
    response = requests.get(url, headers=headers, params=params, timeout=10)
    if response.status_code == 200:
        print(f"PASS ✅ Bhuvan Responded: {response.json()}")
    else:
        print(f"FAIL ❌ Bhuvan returned {response.status_code}")
        raise Exception("Bhuvan Geocoding Failed")
except Exception as e:
    print(f"Switching to Nominatim fallback for placename {search_place}...")
    url = f"https://nominatim.openstreetmap.org/search?q={search_place}&format=json"
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        print(f"PASS ✅ Nominatim forward geocoding worked. First result: {data[0] if data else 'None'}")
    except Exception as e2:
        print(f"FAIL ❌ Nominatim forward geocoding also failed: {e2}")
print()

# TEST 3: BHOONIDHI STAC Authentication
print("─── TEST 3: BHOONIDHI STAC — Authentication ───")
try:
    if not BHOONIDHI_USERNAME or not BHOONIDHI_PASSWORD:
        raise Exception("No Credentials")
    url = "https://bhoonidhi.nrsc.gov.in/bhoonidhi-api/"
    # Assuming POST with credentials
    response = requests.post(url, json={"username": BHOONIDHI_USERNAME, "password": BHOONIDHI_PASSWORD}, timeout=10)
    if response.status_code == 200:
        print("PASS ✅ Bhoonidhi Auth Worked")
    elif response.status_code == 401:
        print("FAIL ❌ BHOONIDHI AUTH FAILED — needs registered account")
        raise Exception("Auth Failed")
    else:
        print(f"FAIL ❌ Bhoonidhi returned {response.status_code}")
        raise Exception("Service Error")
except Exception as e:
    print("Switching to Copernicus Data Space (CDSE) STAC API...")
    url = "https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items"
    params = {
        "bbox": f"{LON-0.01},{LAT-0.01},{LON+0.01},{LAT+0.01}",
        "datetime": "2025-01-01/2026-05-16",
        "limit": 5
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", [])
            print(f"PASS ✅ CDSE STAC fallback worked. Found {len(features)} scenes.")
        else:
            print(f"FAIL ❌ CDSE STAC returned {response.status_code}")
    except Exception as e2:
        print(f"FAIL ❌ CDSE STAC also failed: {e2}")
print()

# TEST 4, 5, 6, 7: Google Earth Engine
print("─── TEST 4: GOOGLE EARTH ENGINE — NDVI Fetch ───")
ndvi_stats, ndwi_stats, vv_stats = None, None, None
try:
    ee.Initialize(project=GEE_PROJECT_ID)
    point = ee.Geometry.Point([LON, LAT])
    buffer = point.buffer(500)
    
    # Sentinel 2 NDVI & NDWI
    s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
         .filterBounds(buffer) \
         .filterDate('2025-10-01', '2026-04-30') \
         .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
         .sort('CLOUDY_PIXEL_PERCENTAGE') \
         .first()
    
    ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI')
    stats_ndvi = ndvi.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
        geometry=buffer,
        scale=10,
        maxPixels=1e9
    )
    ndvi_stats = stats_ndvi.getInfo()
    print(f"PASS ✅ GEE NDVI: {ndvi_stats}")
    
    print("─── TEST 5: NDWI Calculation (same GEE session) ───")
    ndwi = s2.normalizedDifference(['B3', 'B8']).rename('NDWI')
    stats_ndwi = ndwi.reduceRegion(
        reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True),
        geometry=buffer,
        scale=10,
        maxPixels=1e9
    )
    ndwi_stats = stats_ndwi.getInfo()
    print(f"PASS ✅ GEE NDWI: {ndwi_stats}")
    
    print("─── TEST 6: Sentinel-1 SAR Backscatter ───")
    s1 = ee.ImageCollection('COPERNICUS/S1_GRD') \
         .filterBounds(buffer) \
         .filterDate('2025-10-01', '2026-04-30') \
         .filter(ee.Filter.eq('instrumentMode', 'IW')) \
         .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
         .first()
    
    stats_vv = s1.select('VV').reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=buffer,
        scale=10,
        maxPixels=1e9
    )
    vv_stats = stats_vv.getInfo()
    print(f"PASS ✅ GEE SAR VV: {vv_stats}")

except Exception as e:
    print(f"FAIL ❌ GEE Failed: {e}")

print("─── TEST 7: Crop Type Classification (this location) ───")
# Sample logic based on results
ndvi_mean = ndvi_stats.get('NDVI_mean') if ndvi_stats else None
ndwi_mean = ndwi_stats.get('NDWI_mean') if ndwi_stats else None
sar_vv = vv_stats.get('VV') if vv_stats else None

print(f"CROP CLASSIFICATION RESULT for {LAT}, {LON}:")
if ndvi_mean is not None:
    season = "Rabi" # As we used Oct-Apr range
    if ndvi_mean >= 0.6:
        print("RESULT: Active healthy crop detected")
    elif ndvi_mean >= 0.3:
        print("RESULT: Moderate vegetation detected")
    else:
        print("RESULT: Barren/Fallow detected")
    
    print(f"SEASON: {season}")
    
    irrigation = "Rainfed"
    if ndwi_mean is not None and ndwi_mean > 0.1:
        irrigation = "Irrigated"
    elif ndwi_mean is not None and ndwi_mean < -0.3:
        irrigation = "Dry"
    print(f"IRRIGATION STATUS: {irrigation}")
    
    fraud = "LOW"
    if ndvi_mean < 0.2:
        fraud = "HIGH"
    print(f"FRAUD RISK BASELINE: {fraud}")
else:
    print("RESULT: Unknown (Missing satellite data)")
    print("SEASON: Unknown")
    print("IRRIGATION STATUS: Unknown")
    print("FRAUD RISK BASELINE: HIGH")
