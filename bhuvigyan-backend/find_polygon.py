import requests
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

KGIS_WS = "https://kgis.ksrsac.in:9000/genericwebservices/ws"

def find_any_polygon(kgis_id):
    print(f"Searching for any polygon in village {kgis_id}...")
    # Try surveys 1 to 20
    for sno in range(1, 21):
        url = f"{KGIS_WS}/geomForSurveyNum/{kgis_id}/{sno}/DD"
        try:
            r = requests.get(url, verify=False, timeout=10)
            data = r.json()
            if data and data[0].get("message") == "200":
                print(f"FOUND! Survey {sno} has polygon.")
                print(f"WKT: {data[0]['geom'][:100]}...")
                return data[0]
        except:
            pass
    print("No polygon found in first 20 surveys.")
    return None

if __name__ == "__main__":
    # We know 7509 is a valid village ID we found
    res = find_any_polygon("7509")
    if not res:
        # Try another village ID nearby? 
        # Let's try 1 to 10 for kgis_id just to find ANY real agri data
        for vid in range(7500, 7515):
            res = find_any_polygon(str(vid))
            if res:
                break
