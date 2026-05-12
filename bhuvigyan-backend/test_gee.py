import sys
import warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, r"c:\Users\athar\Desktop\Agri\bhuvigyan-backend")

try:
    from app.services.satellite_service import SatelliteService, GEE_AVAILABLE
    from app.services.gee_init import initialize_gee, GEE_INITIALIZED, GEE_INIT_ERROR

    print(f"GEE_AVAILABLE: {GEE_AVAILABLE}")
    
    svc = SatelliteService()
    
    # Test thumbnail generation (this will trigger GEE init)
    print("\nTesting satellite thumbnail generation for Pune (18.5204, 73.8567) with 5km radius...")
    thumb = svc.get_satellite_thumbnail_b64(18.5204, 73.8567, buffer_m=5000)
    print(f"GEE_INITIALIZED: {GEE_INITIALIZED}")
    print(f"GEE_INIT_ERROR: {GEE_INIT_ERROR}")
    
    if thumb:
        print(f"✓ Thumbnail generated: {len(thumb)} chars")
        print(f"✓ Has image: YES")
    else:
        print(f"✗ Thumbnail not generated (empty string)")
    
    # Test full analysis
    print("\nTesting full analysis...")
    analysis = svc.get_full_analysis(18.5204, 73.8567)
    print(f"NDVI: {analysis.get('ndvi', {})}")
    print(f"Thumbnail in analysis: {bool(analysis.get('thumbnail_b64'))}")
    
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()

