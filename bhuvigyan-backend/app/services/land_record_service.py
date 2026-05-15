import httpx
import logging
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Setup logging
logger = logging.getLogger(__name__)

# --- Models ---

class OwnerRecord(BaseModel):
    name: str
    is_primary: bool = False

class LandRecordRequest(BaseModel):
    district: str
    taluk: str
    hobli: str
    village: str
    survey_no: str
    hissa_no: str
    period: Optional[str] = "Current Year"

class LandRecordResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    input: Optional[LandRecordRequest] = None
    cadastrali_id: Optional[str] = None
    owners: List[str] = []
    total_area: Optional[str] = None
    survey_no: Optional[str] = None
    village: Optional[str] = None
    crops: Optional[str] = None
    land_code: Optional[str] = None
    raw: Optional[Any] = None

# --- Service Functions ---

def build_cadastral_id(district: str, taluk: str, hobli: str, village: str, survey_no: str, hissa_no: str) -> str:
    """
    Generate a deterministic cadastral ID string.
    Normalizes inputs and joins them. 
    Note: Real cadastral IDs are usually fixed-width numeric codes, 
    but we use a delimited format for now which can be mapped later.
    """
    def clean(s: str) -> str:
        return re.sub(r'[^A-Z0-9]', '', s.strip().upper())

    # If the user provided numeric codes in the CSV-like format, we try to preserve them
    # Otherwise, we just join the cleaned names.
    # For the sujala3lri API, the cadastralId is often the full 12-digit village code 
    # followed by survey/hissa in a specific format.
    # We will join them with a hyphen for now as a 'logical' ID.
    
    parts = [
        clean(district),
        clean(taluk),
        clean(hobli),
        clean(village),
        clean(survey_no),
        clean(hissa_no)
    ]
    return "-".join(parts)

async def fetch_bhoomi_data(cadastrali_id: str) -> Dict[str, Any]:
    """
    Calls the official Sujala3LRI / Bhoomi mobile service endpoint.
    """
    url = f"https://mobservice.sujala3lri.karnataka.gov.in/api/GetBhoomiData?cadastraliId={cadastrali_id}"
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    logger.info(f"Fetching Bhoomi data for ID: {cadastrali_id}")
    
    try:
        async with httpx.AsyncClient(timeout=20.0, verify=False) as client:
            response = await client.get(url, headers=headers)
            
            logger.info(f"Bhoomi API Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    return response.json()
                except Exception as e:
                    logger.error(f"Failed to parse JSON from Bhoomi API: {e}")
                    return {"error": "Invalid JSON response", "raw": response.text}
            else:
                logger.error(f"Bhoomi API returned non-200 status: {response.status_code}")
                return {"error": f"HTTP {response.status_code}", "raw": response.text}
                
    except httpx.TimeoutException:
        logger.error("Bhoomi API request timed out")
        return {"error": "Request timed out"}
    except Exception as e:
        logger.error(f"Unexpected error calling Bhoomi API: {e}")
        return {"error": str(e)}

def parse_owners(owners_data: Any) -> List[str]:
    """
    Cleans and splits the owners string into a list of names.
    """
    if not owners_data:
        return []
    
    if not isinstance(owners_data, str):
        return [str(owners_data)]
    
    # Split by common delimiters: newline, semicolon, pipe, comma
    # Also handle "and" if it's used as a separator
    delimiters = r'[\n;|,/]'
    raw_list = re.split(delimiters, owners_data)
    
    clean_list = []
    for name in raw_list:
        name = name.strip()
        # Further split by " AND " if it looks like a separator
        if " AND " in name.upper():
            sub_names = re.split(r' AND ', name, flags=re.IGNORECASE)
            for sn in sub_names:
                sn = sn.strip()
                if sn: clean_list.append(sn)
        elif name:
            clean_list.append(name)
            
    return clean_list

async def get_land_record(req: LandRecordRequest) -> LandRecordResponse:
    """
    Orchestrates the build, fetch, and parse flow.
    """
    cadastrali_id = build_cadastral_id(
        req.district, req.taluk, req.hobli, req.village, 
        req.survey_no, req.hissa_no
    )
    
    raw_data = await fetch_bhoomi_data(cadastrali_id)
    
    # Check if we got an error response
    if isinstance(raw_data, dict) and "error" in raw_data:
        return LandRecordResponse(
            success=False,
            message=raw_data["error"],
            input=req,
            cadastrali_id=cadastrali_id,
            raw=raw_data.get("raw")
        )
    
    # Handle both list and single object responses
    items = raw_data if isinstance(raw_data, list) else [raw_data]
    
    if not items or (len(items) == 1 and not items[0]):
        return LandRecordResponse(
            success=False,
            message="No records found for this cadastral ID",
            input=req,
            cadastrali_id=cadastrali_id,
            raw=raw_data
        )
    
    # Use the first record (most relevant)
    item = items[0]
    
    # Extract fields as requested
    land_code = item.get("LandCode")
    village = item.get("Village")
    survey_no = item.get("SurveyNo")
    total_area = item.get("TotalArea")
    raw_owners = item.get("Owners")
    crops = item.get("Crops")
    
    owners = parse_owners(raw_owners)
    
    return LandRecordResponse(
        success=True,
        input=req,
        cadastrali_id=cadastrali_id,
        owners=owners,
        total_area=str(total_area) if total_area is not None else None,
        survey_no=str(survey_no) if survey_no is not None else None,
        village=village,
        crops=crops,
        land_code=land_code,
        raw=raw_data
    )
