import requests
import sys

# Set output to utf-8
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_types(code):
    bases = [
        "https://kgis.ksrsac.in:9000/genericwebservices/ws",
        "http://kgis.ksrsac.in:9000/genericwebservices/ws",
        "https://kgis.ksrsac.in/genericwebservices/ws",
        "http://kgis.ksrsac.in/genericwebservices/ws"
    ]
    types = ["lgd", "kgis", "bhoomi"]
    
    print(f"PROBING ADMIN HIERARCHY FOR CODE: {code}")
    print("-" * 50)
    
    for base in bases:
        for t in types:
            url = f"{base}/kgisadminhierarchy"
            params = {
                "deptcode": "01",
                "applncode": "0102",
                "code": code,
                "type": t
            }
            try:
                r = requests.get(url, params=params, timeout=5)
                if r.status_code == 200:
                    data = r.json()
                    if data and isinstance(data, list) and data[0].get("message") == "Data Available":
                        print(f"SUCCESS! Base: {base}, Type: {t}")
                        print(f"   Result: {data[0]}")
                        return data[0]
            except:
                pass
    print("All combinations failed.")
    return None

if __name__ == "__main__":
    test_types("555054330") 
    test_types("054335974750") 
    test_types("604199") 
