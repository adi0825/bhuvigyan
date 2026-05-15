import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath("."))

from app.services import land_service

async def main():
    print("Testing District/Taluk/Village from Local CSV...")
    
    # 1. Test Districts
    districts = await land_service.get_districts("karnataka")
    print(f"Districts Found: {len(districts)}")
    
    # 2. Test Taluks for Bagalkot
    taluks = await land_service.get_taluks("Bagalkot", "karnataka")
    print(f"Taluks in Bagalkot: {len(taluks)}")
    if taluks:
        sample_taluk = taluks[0]
        print(f"Sample Taluk: {sample_taluk}")
        
        # 3. Test Villages for this Taluk
        villages = await land_service.get_villages(
            hobli_id=sample_taluk['TalukCode'], 
            taluk_raw=sample_taluk['Raw'], 
            district="Bagalkot", 
            state="karnataka"
        )
        print(f"Villages Found: {len(villages)}")
        if villages:
            print(f"Sample Village: {villages[0]}")

    # 4. Test Fetch RTC (Verification)
    print("\nTesting Land Verification (Fetch RTC)...")
    rtc = await land_service.fetch_rtc(
        district="Bagalkot",
        taluk="Badami",
        hobli="Main Hobli",
        village="Adagal",
        survey_number="124",
        hissa_number="1"
    )
    print(f"Verification Success: {rtc.get('success')}")
    print(f"Owner Name: {rtc.get('owner_name')}")

if __name__ == "__main__":
    asyncio.run(main())
