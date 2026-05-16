"""End-to-end test for My Land API endpoints."""
import httpx
import json

base = "http://127.0.0.1:8000/api/v1/my-land"

def test_village_geocode():
    print("=== Village Geocode ===")
    r = httpx.post(base + "/village-geocode", json={"village": "Sekuru"}, timeout=15)
    print("Status:", r.status_code)
    d = r.json()
    print("Found:", d.get("success"))
    villages = (d.get("data") or {}).get("villages") or []
    if villages:
        v = villages[0]
        print("Village:", v.get("village_name"), "| District:", v.get("district"), 
              "| Lat:", v.get("latitude"), "| Lng:", v.get("longitude"))
    return d

def test_add_land_holding():
    print("\n=== Add Land Holding ===")
    r = httpx.post(base + "/add-land-holding", json={
        "farmer_id": "test-farmer-001",
        "state": "ANDHRA PRADESH", "district": "Guntur", "taluk": "Chebrolu",
        "village": "Sekuru", "survey_number": "789", "land_area_acres": 2.0,
        "declared_crop": "Paddy (Rice)", "season": "Kharif"
    }, timeout=15)
    print("Status:", r.status_code)
    d = r.json()
    print("Success:", d.get("success"))
    data = d.get("data") or {}
    print("ID:", data.get("id"))
    print("Label:", data.get("label"))
    print("Bhuvan VID:", data.get("bhuvan_vid"))
    print("Location verified:", data.get("location_verified"))
    return data.get("id")

def test_get_holdings():
    print("\n=== Get Land Holdings ===")
    r = httpx.get(base + "/land-holdings/test-farmer-001", timeout=10)
    print("Status:", r.status_code)
    d = r.json()
    print("Count:", d.get("count"))

def test_get_holding(hid):
    print("\n=== Get Land Holding ===")
    r = httpx.get(base + "/land-holding/" + hid, timeout=10)
    print("Status:", r.status_code)
    d = r.json()
    print("Success:", d.get("success"))
    print("Survey:", (d.get("data") or {}).get("survey_number"))

def test_verify_land(hid):
    print("\n=== Verify Land ===")
    r = httpx.post(base + "/verify-land", json={
        "land_holding_id": hid, "farmer_id": "test-farmer-001"
    }, timeout=120)
    print("Status:", r.status_code)
    d = r.json()
    print("Success:", d.get("success"))
    data = d.get("data") or {}
    for s in data.get("pipeline_steps") or []:
        msg = s.get("message", "")
        extra = " (" + msg + ")" if msg else ""
        print("  " + s["step"] + ": " + s["status"] + extra)
    print("NDVI:", data.get("ndvi_mean"), "| Status:", data.get("ndvi_status"))
    print("Moisture:", data.get("soil_moisture"))
    print("Source:", data.get("source"))
    print("Radar fallback:", data.get("used_radar_fallback"))
    print("Verification:", data.get("verification_status"))
    cm = data.get("crop_mix")
    if cm:
        print("Crops:", [c.get("name") for c in cm.get("crops", [])])
        print("Confidence:", cm.get("confidence"))
    print("Truth packet:", "yes" if data.get("truth_packet") else "no")

def test_truth_packet(hid):
    print("\n=== Truth Packet Download ===")
    r = httpx.get(base + "/truth-packet/" + hid, timeout=10)
    print("Status:", r.status_code)
    d = r.json()
    text = (d.get("data") or {}).get("text", "")
    if text:
        print("Text preview (first 300 chars):")
        print(text[:300])

if __name__ == "__main__":
    test_village_geocode()
    hid = test_add_land_holding()
    if hid:
        test_get_holdings()
        test_get_holding(hid)
        test_verify_land(hid)
        test_truth_packet(hid)
    print("\n=== ALL TESTS COMPLETE ===")
