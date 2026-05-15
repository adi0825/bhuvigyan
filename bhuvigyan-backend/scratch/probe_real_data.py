import requests
import json

BASE_URL = "https://kgis.ksrsac.in:9000/genericwebservices/ws/"

# Endpoints to test
endpoints = [
    "kgisadminhierarchy",
    "surveyno",
    "surveypolygon",
    "getrtc",
    "getownerdetails",
    "landrecord",
    "rtc",
    "owner"
]

params = {
    "deptcode": "01",
    "applncode": "0102",
    "villagecode": "7509", # Example KGIS village ID for Gowrapura.M.Adura
    "surveyno": "1"
}

print("PROBING KGIS ENDPOINTS FOR REAL DATA (OWNERS/RTC)...")
print("-" * 50)

for ep in endpoints:
    url = f"{BASE_URL}{ep}"
    try:
        r = requests.get(url, params=params, timeout=5)
        print(f"[{ep}] Status: {r.status_code}")
        if r.status_code == 200:
            try:
                data = r.json()
                print(f"  Data Found! Keys: {list(data.keys()) if isinstance(data, dict) else 'List'}")
                if 'owner' in str(data).lower() or 'name' in str(data).lower():
                    print(f"  POTENTIAL OWNER DATA: {json.dumps(data)[:200]}...")
            except:
                print(f"  Non-JSON response (Length: {len(r.text)})")
    except Exception as e:
        print(f"[{ep}] Error: {e}")

print("\nCHECKING surveypolygon PROPERTIES...")
url = f"{BASE_URL}surveypolygon"
params = {
    "deptcode": "01",
    "applncode": "0102",
    "villagecode": "7509",
    "surveyno": "1"
}
try:
    r = requests.get(url, params=params, timeout=5)
    if r.status_code == 200:
        data = r.json()
        if "features" in data:
            props = data["features"][0].get("properties", {})
            print(f"Polygon Properties: {props}")
except Exception as e:
    print(f"Polygon check error: {e}")
