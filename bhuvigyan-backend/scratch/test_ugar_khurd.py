import asyncio
import sys
import os
sys.path.append(os.path.abspath("."))
from app.services import land_service

async def main():
    print("Resolving Ugar Khurd (Code 054335974750)...")
    res = await land_service.get_admin_hierarchy("054335974750")
    print(res)
    
    if res.get("found"):
        kgis_id = res.get("kgis_village_id")
        print(f"\nKGIS ID: {kgis_id}")
        
        # Test geomForSurveyNum for Survey 282
        url = f"https://kgis.ksrsac.in:9000/genericwebservices/ws/geomForSurveyNum/{kgis_id}/282/DD"
        import requests
        print(f"Testing: {url}")
        r = requests.get(url, timeout=10)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
