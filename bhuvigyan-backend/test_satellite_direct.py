import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.gee_init import initialize_gee, GEE_INITIALIZED
from app.services.satellite_service import SatelliteService

print("Testing GEE initialization...")
print("-" * 50)

try:
    initialize_gee()
    print(f"✅ GEE initialized: {GEE_INITIALIZED}")
except Exception as e:
    print(f"❌ GEE initialization failed: {e}")
    print("This is expected if GEE credentials are not configured.")
    print("Satellite endpoints will use mock data instead.")
    sys.exit(0)

print("\nTesting satellite service...")
print("-" * 50)

sat_service = SatelliteService()

# Test thumbnail generation
print("Testing thumbnail generation (lat: 13.28, lng: 77.54)...")
try:
    thumbnail = sat_service.get_satellite_thumbnail_b64(13.28, 77.54, buffer_m=5000)
    if thumbnail:
        print(f"✅ Thumbnail generated: {len(thumbnail)} chars (base64)")
    else:
        print("⚠️  Thumbnail is empty (might be mock data)")
except Exception as e:
    print(f"❌ Thumbnail generation failed: {e}")

# Test full analysis
print("\nTesting full analysis (lat: 13.28, lng: 77.54)...")
try:
    analysis = sat_service.get_full_analysis(13.28, 77.54)
    print(f"✅ Full analysis generated")
    print(f"   NDVI: {analysis.get('ndvi', {}).get('ndvi', 'N/A')}")
    print(f"   Health: {analysis.get('ndvi', {}).get('health_label', 'N/A')}")
    print(f"   Thumbnail: {'Yes' if analysis.get('thumbnail_b64') else 'No'}")
except Exception as e:
    print(f"❌ Full analysis failed: {e}")

print("\n" + "=" * 50)
print("Test complete!")
