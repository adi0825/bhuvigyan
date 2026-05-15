import requests
import json

# Bhoomi Service Bases
BASES = [
    "https://landrecords.karnataka.gov.in/service1.svc",
    "https://landrecords.karnataka.gov.in/Service1.svc"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://landrecords.karnataka.gov.in/",
    "X-Requested-With": "XMLHttpRequest"
}

# Potential endpoints for RTC/Owners
endpoints = [
    "getRTCDetails",
    "getOwnerDetails",
    "getLandDetails",
    "getRTCData",
    "getOwnerData",
    "getRTC",
    "getOwner"
]

# Example parameters for Haveri/Bagalkot
# District 11 (Haveri), Taluk 1104, Hobli 110401, Village 1104010013
params = {
    "districtId": "11",
    "talukId": "1104",
    "hobliId": "110401",
    "villageId": "1104010013",
    "surveyNo": "1",
    "hissaNo": "1",
    "surnoc": "*"
}

print("PROBING BHOOMI SERVICE FOR REAL RTC/OWNER DATA...")
print("-" * 50)

for base in BASES:
    for ep in endpoints:
        url = f"{base}/{ep}"
        try:
            # Most Bhoomi APIs are GET or POST
            r = requests.get(url, params=params, headers=HEADERS, timeout=5)
            print(f"[{ep}] GET Status: {r.status_code}")
            if r.status_code == 200:
                print(f"  SUCCESS! Data: {r.text[:200]}...")
            
            # Try POST too
            r = requests.post(url, json=params, headers=HEADERS, timeout=5)
            print(f"[{ep}] POST Status: {r.status_code}")
            if r.status_code == 200:
                print(f"  SUCCESS! Data: {r.text[:200]}...")
        except Exception as e:
            pass
