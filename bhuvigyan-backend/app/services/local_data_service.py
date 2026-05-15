import csv
import os
import re
from typing import List, Dict

# The uploads directory is in the root Agri folder
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads")

def _parse_name_id(text: str):
    if not text:
        return "", ""
    # Matches "Name 12345" or just "Name"
    match = re.search(r'^(.*?)\s+(\d+)$', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return text.strip(), text.strip()

def get_local_districts(state: str = "karnataka") -> List[Dict]:
    file_path = os.path.join(UPLOAD_DIR, f"{state.lower()}.csv")
    if not os.path.exists(file_path):
        # Try other common filenames
        alt_files = ["karnataka.csv", "maharashtra_villages.csv", "gujarat.csv"]
        for alt in alt_files:
            if alt.startswith(state.lower()):
                file_path = os.path.join(UPLOAD_DIR, alt)
                break
    
    if not os.path.exists(file_path):
        return []
    
    districts = set()
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                d = row.get('District')
                if d:
                    districts.add(d)
    except Exception as e:
        print(f"Error reading local districts: {e}")
        
    return [{"DistrictName": d, "DistrictCode": d} for d in sorted(list(districts))]

def get_local_taluks(district: str, state: str = "karnataka") -> List[Dict]:
    file_path = os.path.join(UPLOAD_DIR, f"{state.lower()}.csv")
    if not os.path.exists(file_path):
        alt_files = ["karnataka.csv", "maharashtra_villages.csv", "gujarat.csv"]
        for alt in alt_files:
            if alt.startswith(state.lower()):
                file_path = os.path.join(UPLOAD_DIR, alt)
                break
                
    if not os.path.exists(file_path):
        return []
    
    taluks = set()
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('District') == district:
                    t = row.get('Taluka') or row.get('Taluk')
                    if t:
                        taluks.add(t)
    except Exception as e:
        print(f"Error reading local taluks: {e}")
        
    result = []
    for t in sorted(list(taluks)):
        name, code = _parse_name_id(t)
        result.append({"TalukName": name, "TalukCode": code, "Raw": t})
    return result

def get_local_villages(taluka_raw: str, district: str = None, state: str = "karnataka") -> List[Dict]:
    file_path = os.path.join(UPLOAD_DIR, f"{state.lower()}.csv")
    if not os.path.exists(file_path):
        alt_files = ["karnataka.csv", "maharashtra_villages.csv", "gujarat.csv"]
        for alt in alt_files:
            if alt.startswith(state.lower()):
                file_path = os.path.join(UPLOAD_DIR, alt)
                break

    if not os.path.exists(file_path):
        return []
    
    villages = set()
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                t = row.get('Taluka') or row.get('Taluk')
                d = row.get('District')
                # If district is provided, filter by both
                if (district is None or d == district) and t == taluka_raw:
                    v = row.get('Village')
                    if v:
                        villages.add(v)
    except Exception as e:
        print(f"Error reading local villages: {e}")
        
    result = []
    for v in sorted(list(villages)):
        name, code = _parse_name_id(v)
        result.append({"VillageName": name, "VillageCode": code, "Raw": v})
    return result

def search_village_by_name(village_name: str, taluk: str = None, district: str = None, state: str = "karnataka") -> Dict:
    """Search for a village by name and return its code if found."""
    file_path = os.path.join(UPLOAD_DIR, f"{state.lower()}.csv")
    if not os.path.exists(file_path):
        alt_files = ["karnataka.csv", "maharashtra_villages.csv", "gujarat.csv"]
        for alt in alt_files:
            if alt.startswith(state.lower()):
                file_path = os.path.join(UPLOAD_DIR, alt)
                break

    if not os.path.exists(file_path):
        return {}

    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                v = row.get('Village')
                t = row.get('Taluka') or row.get('Taluk')
                d = row.get('District')
                if v and v.lower() == village_name.lower():
                    if (taluk is None or t == taluk) and (district is None or d == district):
                        return {
                            "village_name": v,
                            "village_code": row.get('VillageCode', v),
                            "taluk": t,
                            "district": d,
                            "state": state
                        }
    except Exception as e:
        print(f"Error searching village: {e}")

    return {}
