# Bhuvigyan V7 — Software Requirements Specification
### Crop Insurance Fraud Detection & Farmer Portal System
**Version:** 7.0 | **Date:** May 2026 | **Ministry of Agriculture & Farmers Welfare, GoI**
**Developed by:** National Informatics Centre (NIC) | **Stack:** FastAPI · C++ · React · TypeScript · Tailwind · PostgreSQL · Redis · Google Earth Engine

***

## Table of Contents

1. Executive Summary
2. What Changed in V7 (vs V6)
3. System Architecture Overview
4. User Roles — Simplified (V7)
5. Farmer Self-Registration Flow
6. Farmer Dashboard — V7 Design
7. Real-Time Satellite Intelligence (GEE Integration)
8. Claim Filing — Complete Correct Process
9. Admin Panel — All Tabs, Full Detail
10. Database Schema Changes (V7)
11. Backend API Reference (V7)
12. Frontend Pages & Components
13. Notification & Alert System
14. Security & Compliance
15. Build Order & Deployment

***

## 1. Executive Summary

Bhuvigyan V7 is a fundamental redesign of the user architecture and farmer-facing experience based on the following directive changes from the V6 specification:

- **Role simplification**: Remove State DC, District Head, and all intermediate government portal users. The system now has only two active roles: **Farmer** (self-registers and self-manages) and **Admin** (single super-admin panel handles everything).
- **Self-registration**: Farmers register themselves on the portal without any officer assistance. The registration flow captures identity, location, land records, and bank details in a guided 4-step process matching the existing UI design (images provided).
- **Real satellite data**: Replace all mock NDVI with live Google Earth Engine (GEE) Sentinel-2 pipeline. The Bhumi AI Intelligence card on the farmer dashboard shows real NDVI computed from `COPERNICUS/S2_SR_HARMONIZED` with actual last-scan date and crop health index.
- **Correct claim filing**: The full PMFBY-compliant claim process with all required documents, 72-hour intimation rule, geo-tagged evidence, and step-by-step guided flow.
- **Complete Admin Panel**: Every tab in the admin panel is fully specified with UI layout, function, data shown, and why it exists.

***

## 2. What Changed in V7 (vs V6)

| Area | V6 | V7 |
|------|----|----|
| User Roles | 5 (Farmer, Officer, State DC, Insurer, Admin) | 2 (Farmer, Admin) |
| Registration | Officer creates farmer account | Farmer self-registers |
| NDVI Data | Mock/simulated | Real GEE Sentinel-2 live pipeline |
| Claim Filing | Basic form | Full PMFBY-compliant 6-step process with doc upload |
| Admin Panel | Basic tabs | 12 fully specified tabs with complete UI & function |
| Farmer Dashboard | Simple stats | Bhumi AI card + NDVI gauge + claims tracker + Carbon Credits tab |
| Land Verification | Manual officer check | Upload-based verification (RTC, KGIS, Aadhaar seed) |
| Satellite Sources | Single mock | Sentinel-2, Sentinel-1 SAR, IMD weather, NASA FIRMS fire |

***

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BHUVIGYAN V7 SYSTEM                      │
├─────────────────┬───────────────────────────────────────────┤
│  FARMER PORTAL  │           ADMIN PANEL                     │
│  (Self-service) │         (Full control)                    │
├─────────────────┴───────────────────────────────────────────┤
│                    FastAPI Backend (Python)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ Auth     │ │ Farmer   │ │ Claims   │ │ Satellite    │    │
│  │ Service  │ │ Service  │ │ Service  │ │ Service (GEE)│    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │ 
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ C++ Fraud│ │ Document │ │ Notif.   │ │ Admin        │    │
│  │ Engine   │ │ Service  │ │ Service  │ │ Service      │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 16  │  Redis 7  │  GEE Python SDK  │  MinIO S3│
└─────────────────────────────────────────────────────────────┘
```

### External API Integrations

| Service | Purpose | Endpoint / SDK |
|---------|---------|----------------|
| Google Earth Engine | Real NDVI, NDWI, SAR, crop health | `ee` Python SDK, `COPERNICUS/S2_SR_HARMONIZED` |
| IMD Open Data | Rainfall, temperature, humidity | `imdopen.imd.gov.in` |
| NASA FIRMS | Active fire hotspots near farm | `firms.modaps.eosdis.nasa.gov/api/` |
| KGIS Karnataka | Land record verification | `kgis.ksrsac.in` (state API) |
| Bhunaksha / DILRMP | Survey number validation, land parcel boundary | `bhunaksha.nic.in` |
| UIDAI Aadhaar OTP | Identity verification | `uidai.gov.in` masked OTP API |
| NPCI / NACH | Bank account penny-drop verification | `npci.org.in` |
| PMFBY NCIP | National Crop Insurance Portal sync | `ncip.nic.in` |

***

## 4. User Roles — Simplified (V7)

V7 has exactly **two roles**. All intermediate government portal logins (State DC, District Head, Field Officer, Insurer) are removed.

### Role 1: Farmer
- Self-registers on the portal
- Manages own profile, land records, policies, and claims
- Views real-time satellite data for their land
- Files PMFBY claims with document upload
- Receives notifications and payout updates
- Access: Farmer portal only (`/farmer/*`)

### Role 2: Admin
- Single admin account (NIC/Ministry level)
- Full access to all system data, all farmers, all claims
- Approves/rejects claims, flags fraud, manages system config
- Views all satellite analytics, fraud scores, audit logs
- Access: Admin portal only (`/admin/*`)

### Seed Credentials (Development)
```
Farmer:  mobile: 9900000001  password: Farmer@123
Admin:   mobile: 9500000001  password: Admin@2026#Bhuvigyan
```

***

## 5. Farmer Self-Registration Flow

The registration is a **4-step guided wizard** matching the UI shown in the reference screenshots. Farmers complete this entirely on their own without any officer assistance.

### Step 1 — Personal Information
**UI:** White card, centered, leaf icon in green rounded square at top, "Farmer Registration / PMFBY Insurance Portal" heading. Progress stepper shows steps 1–4.

**Fields:**
- Full Name (`As per Aadhaar`) — required, min 3 chars, only letters + spaces
- Mobile Number (+91 prefix, 10-digit input) — required, `/^[6-9]\d{9}$/`
- Preferred Language — dropdown: English, हिंदी, ಕನ್ನಡ, తెలుగు, मराठी, ਪੰਜਾਬੀ
- Date of Birth — required (must be 18+ years old)
- Gender — radio: Male / Female / Other
- Aadhaar Number — 12-digit, validated via UIDAI format check
- **"Next →" button** triggers OTP to mobile before proceeding

**Validation:**
- Aadhaar: `/^\d{12}$/` — visual masking after entry (XXXX-XXXX-1234)
- Mobile OTP sent immediately on "Next" click, verified before Step 2 unlocks

### Step 2 — Land Location
**UI:** Same white card. Step 1 shows green checkmark, Step 2 is active.

**Fields (cascading dropdowns):**
- State → pre-filled based on KGIS if Karnataka detected
- District → populated from State selection
- Taluk → populated from District selection
- Hobli → populated from Taluk selection (Karnataka-specific administrative unit)
- Village → populated from Hobli selection

**Logic:**
- Dropdowns are populated from a local GeoJSON seed file (all 28 states, districts, taluks, villages) — no API call needed for dropdown population
- On "Next", the State + District + Taluk + Village combination is validated against Bhunaksha/DILRMP to confirm the administrative unit exists

### Step 3 — Land & Banking Details
**UI:** Step 3 active. Shows "Land & Banking Details" heading.

**Fields:**
- Survey Number (e.g. 124/2-A or 123/A format) — required
- Total Land Area (Hectares) — decimal input, max 100 Ha
- Land Ownership Type — radio: Owner / Tenant / Sharecropper
- Bank Account Number — required, 9–18 digit
- IFSC Code — required, `/^[A-Z]{4}0[A-Z0-9]{6}$/`
- Bank Name — auto-filled from IFSC lookup

**Document Upload Section (critical V7 addition):**

| Document | Required? | Format | Purpose |
|----------|-----------|--------|---------|
| RTC / Pahani | **Mandatory** | PDF/JPG, max 5MB | Primary land ownership proof |
| Aadhaar Card (front+back) | **Mandatory** | PDF/JPG, max 2MB | Identity verification |
| Passbook / Cancelled Cheque | **Mandatory** | JPG/PDF, max 2MB | Bank account verification |
| Land Map (survey sketch) | Optional | PDF/JPG, max 5MB | Strengthens verification |
| Tenancy Agreement | If Tenant/Sharecropper | PDF, max 5MB | Required for non-owners |
| Sowing Certificate | Optional | JPG/PDF, max 2MB | Crop sown confirmation |

**KGIS Auto-Verification (Karnataka):**
When State = Karnataka, on "Register & Get OTP" click:
1. System calls KGIS API with Survey Number + Taluk + Village
2. Returns: verified land area, owner name, RTC record status
3. If KGIS match found: shows "KGIS VERIFICATION → APPROVED" badge (as seen in image 1)
4. If no match: shows "KGIS VERIFICATION → PENDING MANUAL REVIEW"
5. Aadhaar Seeding status fetched separately: "AADHAAR SEEDED → APPROVED / NOT SEEDED"

**Bank Verification:**
- IFSC entered → calls Razorpay IFSC API to validate and fill Bank Name + Branch
- On submission, penny-drop verification initiated (async, result within 24h)

### Step 4 — Verify OTP & Submit
**UI:** Step 4 active. OTP input with 6 digit boxes.

**Process:**
- 6-digit OTP sent to registered mobile
- On correct OTP: account created, farmer profile saved, KGIS verification initiated
- Redirect to farmer dashboard with "Welcome to Bhuvigyan!" success message
- Profile status shown as "Verification Pending" until admin approves (within 48 hours)

**Post-Registration Verification Queue:**
Admin reviews uploaded documents in the Farmer Verification tab. On approval, status changes to "Verified" and farmer can file claims.

***

## 6. Farmer Dashboard — V7 Design

The farmer dashboard has **5 tabs** (matching the UI shown in image 1):

```
Overview | My Land | My Claims | Carbon Credits | Notifications
```

### Tab 1: Overview

**Layout:** 3 stat cards across top, then Bhumi AI Intelligence card, then recent activity feed.

**Stat Cards (matching image 6 design):**
- **Pending Claims** — yellow/amber card, pulse icon, shows count
- **Approved Claims** — green card, upward arrow icon, shows count
- **Total Paid** — blue card, lightning icon, shows ₹ amount (e.g. ₹78K)

**Bhumi AI Intelligence Card (critical — real-time, not mock):**
This is the centerpiece of the dashboard. Design matches image 6.

```
┌─────────────────────────────────────────────────────────────┐
│ 🌾 Bhumi AI Intelligence               ● Live              │
│    Sentinel-2 · Last scan: 7 May                           │
│                                                             │
│ Crop Health Index                  Good · NDVI 0.65        │
│ [████████████████████████░░░░░░] ●                         │
│  0 — Critical                          100 — Excellent     │
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐  │
│  │  ₹52,500     │    │  2.50 Ha                         │  │
│  │  Est. Payout │    │  Insured Area                    │  │
│  └──────────────┘    └──────────────────────────────────┘  │
│                                                             │
│  🌦 IMD: Normal rainfall           📡 Pipeline: Active     │
└─────────────────────────────────────────────────────────────┘
```

**What drives this card (backend):**
- NDVI value fetched from GEE `COPERNICUS/S2_SR_HARMONIZED` for the farmer's GPS coordinates (survey number centroid)
- NDVI computed as `(B8 - B4) / (B8 + B4)`, cloud-masked, latest available scene (max 10 days old)
- IMD data from IMD Open API for farmer's district
- "Pipeline: Active" = GEE job running; "Pipeline: Stale" = last scan > 15 days
- Cached in Redis for 6 hours, refreshed on each dashboard load if cache expired
- If GEE unavailable: show "Data Unavailable · Retrying" with last known value + timestamp

**NDVI to Health Mapping:**
| NDVI Range | Label | Gauge Color | Est. Loss |
|------------|-------|-------------|-----------|
| 0.65 – 1.0 | Excellent | Green | 0% |
| 0.45 – 0.64 | Good | Light Green | 5–15% |
| 0.30 – 0.44 | Fair | Yellow | 20–40% |
| 0.15 – 0.29 | Poor | Orange | 45–65% |
| 0.00 – 0.14 | Critical | Red | 70–100% |

**Estimated Payout Calculation:**
```
est_payout = (sum_insured × loss_pct_from_ndvi) × area_insured_pct
```

**Recent Activity Feed:**
Timestamped list of last 10 events: claim submitted, inspection scheduled, payout released, NDVI alert triggered, document verified, etc.

### Tab 2: My Land

Matches image 1 exactly. Shows the verified land record card with:
- STATE & DISTRICT (e.g. Karnataka, Bengaluru Rural)
- TALUK & VILLAGE (e.g. Doddaballapura, Hosahalli)
- SURVEY NUMBER (e.g. 124/2-A)
- Map icon center (links to Bhunaksha plot view)
- TOTAL VERIFIED AREA (e.g. 2.5 Ha) — prominently displayed
- KGIS VERIFICATION badge (APPROVED / PENDING)
- AADHAAR SEEDED badge (APPROVED / NOT SEEDED)
- "Download RTC / Pahani" button
- Additional V7 features:
  - NDVI Time Series chart for this specific plot (12-month history)
  - Satellite image thumbnail of the plot (GEE true-color composite)
  - Soil type info (from NBSS&LUP database if available)
  - Historical crop grown (from past claims)

### Tab 3: My Claims

**Layout:** Filter bar + claims table + "File New Claim" CTA button.

**Claims Table Columns:** Claim No. | Season | Crop | Loss Type | Filed Date | Status Badge | Fraud Score | Amount

**Status Badges (color-coded):**
- DRAFT — gray
- SUBMITTED — blue
- DOCUMENT REVIEW — yellow
- SATELLITE ANALYSIS — purple
- FIELD VISIT REQUIRED — orange
- APPROVED — green
- REJECTED — red
- PAYMENT PROCESSING — teal
- PAID — dark green

Each row expands to show full claim timeline with timestamps.

### Tab 4: Carbon Credits

New V7 feature. Shows:
- Total carbon credits earned from verified sustainable farming practices
- Eligible for VERRA/Gold Standard certification
- Trading value in ₹
- History chart of credits earned per season
- CTA: "Enroll in Carbon Program" if not enrolled

### Tab 5: Notifications

Paginated list of all notifications. Filter by type: Claims, Satellite Alerts, Documents, Payments. Mark as read. Notification bell in header shows unread count.

***

## 7. Real-Time Satellite Intelligence (GEE Integration)

This section defines the complete satellite data pipeline replacing all mock data from V6.

### 7.1 GEE Service Account Setup

```python
# app/services/satellite_service.py

import ee
import json
from datetime import datetime, timedelta

SERVICE_ACCOUNT = "bhuvigyan-gee@bhuvigyan-prod.iam.gserviceaccount.com"
KEY_FILE = "/secrets/gee-service-account.json"

credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_FILE)
ee.Initialize(credentials)
```

### 7.2 NDVI Computation (Primary)

**Source:** `COPERNICUS/S2_SR_HARMONIZED` — Sentinel-2 Surface Reflectance, 10m resolution, 5-day revisit

```python
async def get_live_ndvi(lat: float, lng: float, days_back: int = 15) -> dict:
    point = ee.Geometry.Point([lng, lat])
    buffer = point.buffer(500)  # 500m buffer around farm centroid

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_back)

    collection = (
        ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(buffer)
        .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    )

    def add_ndvi(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return image.addBands(ndvi).set('date', image.date().format('YYYY-MM-dd'))

    ndvi_collection = collection.map(add_ndvi).select('NDVI')

    # Get latest image
    latest = ndvi_collection.sort('system:time_start', False).first()
    mean_ndvi = latest.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=buffer,
        scale=10,
        maxPixels=1e9
    )

    # Time series for chart (last 12 months)
    time_series = ndvi_collection.map(lambda img: ee.Feature(None, {
        'date': img.get('date'),
        'ndvi': img.reduceRegion(ee.Reducer.mean(), buffer, 10).get('NDVI')
    }))

    result = {
        'current_ndvi': mean_ndvi.getInfo()['NDVI'],
        'last_scan_date': latest.date().format('d MMM').getInfo(),
        'cloud_coverage': latest.get('CLOUDY_PIXEL_PERCENTAGE').getInfo(),
        'time_series': time_series.getInfo()['features'],
        'source': 'Sentinel-2 SR Harmonized',
        'resolution_m': 10,
        'is_live': True
    }

    return result
```

**Redis Cache Key:** `ndvi:{lat_4dp}:{lng_4dp}` — TTL: 6 hours

**Fallback behavior:** If GEE call fails or times out (>8 seconds):
1. Return cached value with `is_live: False, is_cached: True, cached_at: <timestamp>`
2. Log error to admin alert queue
3. Show "Using cached data from X hours ago" banner on dashboard

### 7.3 SAR Flood Detection (Sentinel-1)

**Source:** `COPERNICUS/S1_GRD` — Sentinel-1 SAR, detects flooding without cloud obstruction

```python
async def get_flood_detection(lat: float, lng: float) -> dict:
    """Compares current SAR backscatter with historical baseline to detect flooding."""
    point = ee.Geometry.Point([lng, lat]).buffer(1000)

    # Historical baseline (same season last year)
    baseline = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filterBounds(point) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .filterDate('2024-06-01', '2024-09-30') \
        .mean()

    # Current
    current = ee.ImageCollection('COPERNICUS/S1_GRD') \
        .filterBounds(point) \
        .filter(ee.Filter.eq('instrumentMode', 'IW')) \
        .filterDate('2025-06-01', '2025-09-30') \
        .mean()

    # Flood mask: VV backscatter drop > 3dB = flooded
    diff = baseline.select('VV').subtract(current.select('VV'))
    flood_mask = diff.gt(3)

    flood_area = flood_mask.multiply(ee.Image.pixelArea()) \
        .reduceRegion(ee.Reducer.sum(), point, 10).getInfo()

    return {
        'flood_detected': flood_area.get('VV', 0) > 100,
        'flood_area_sqm': flood_area.get('VV', 0),
        'source': 'Sentinel-1 SAR GRD'
    }
```

### 7.4 IMD Weather Integration

```python
async def get_imd_weather(district: str, state: str) -> dict:
    """Fetch current weather conditions from IMD Open Data Portal."""
    # IMD Open Data API
    url = f"https://imdopen.imd.gov.in/api/weather?district={district}&state={state}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=5.0)
        data = response.json()

    return {
        'rainfall_mm': data.get('rainfall_mm', 0),
        'temperature_c': data.get('max_temp', None),
        'condition': classify_imd(data),  # Normal / Excess / Deficient / Drought
        'district': district,
        'date': data.get('date')
    }

def classify_imd(data: dict) -> str:
    rf = data.get('rainfall_departure_pct', 0)
    if rf >= 20: return 'Excess'
    if rf >= -19: return 'Normal'
    if rf >= -59: return 'Deficient'
    return 'Drought'
```

### 7.5 NASA FIRMS Fire Alert

```python
async def get_fire_alerts(lat: float, lng: float, radius_km: int = 10) -> dict:
    """Check for active fire hotspots within radius of farm."""
    # NASA FIRMS Area API — no key needed for basic access
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"VIIRS_SNPP_NRT/{lng-0.1},{lat-0.1},{lng+0.1},{lat+0.1}/1"
    )
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)

    lines = response.text.strip().split('\n')
    fire_count = max(0, len(lines) - 1)  # subtract header

    return {
        'fire_detected': fire_count > 0,
        'hotspot_count': fire_count,
        'source': 'NASA FIRMS VIIRS SNPP NRT',
        'radius_km': radius_km
    }
```

### 7.6 Aggregated Satellite Report

Every time the farmer dashboard loads, one aggregated call fetches all satellite data:

```
GET /api/v1/satellite/farm-report?farmer_id={id}
```

Response:
```json
{
  "ndvi": { "value": 0.65, "label": "Good", "last_scan": "7 May", "is_live": true },
  "flood": { "detected": false, "area_sqm": 0 },
  "fire": { "detected": false, "hotspots": 0 },
  "weather": { "condition": "Normal", "rainfall_mm": 12.4 },
  "estimated_payout": 52500,
  "insured_area_ha": 2.5,
  "pipeline_status": "Active",
  "computed_at": "2026-05-10T14:30:00Z"
}
```

***

## 8. Claim Filing — Complete Correct Process

The PMFBY-compliant claim filing process is a **6-step wizard**. The 72-hour intimation rule is enforced by the system.

### PMFBY 72-Hour Rule
The farmer must intimate the loss within 72 hours of the calamity event. The system:
- Shows a prominent warning: "You must file within 72 hours of crop damage"
- On the claim form, asks: "When did the damage occur?" — if more than 72 hours in the past, shows a warning and requires the farmer to select "Delayed Intimation Reason" with a signed self-declaration

### Step 1: Policy Selection
- Farmer selects the active policy from their enrolled policies
- System auto-fills: Insured Crop, Insured Area, Sum Insured, Season, Premium Paid
- Shows current NDVI with note: "Our satellite has already flagged your crop health as [status]"

### Step 2: Loss Details
**Fields:**
- **Calamity Type** — required
  - Drought, Excess Rainfall, Flood, Cyclone, Hailstorm, Pest Attack, Disease, Fire, Other
- **Damage Occurrence Date** — required (date picker, max = today, validated for 72-hour rule)
- **Affected Area (Ha)** — decimal, must be ≤ insured area
- **Estimated Loss %** — slider 0–100
- **Description** — text area, min 50 chars: "Describe what happened to your crop"

### Step 3: Document Upload
**All documents listed with upload slots, format requirements, and why each is needed:**

| # | Document | Required | Format | Size Limit | Why Required |
|---|----------|----------|--------|-----------|--------------|
| 1 | **Insurance Certificate / Policy Document** | Mandatory | PDF/JPG | 5MB | Proves active coverage |
| 2 | **Aadhaar Card** | Mandatory | PDF/JPG | 2MB | Identity proof |
| 3 | **RTC / Pahani (Land Record)** | Mandatory | PDF/JPG | 5MB | Proves land ownership + crop sown |
| 4 | **Sowing Declaration (7/12 or equivalent)** | Mandatory | PDF/JPG | 5MB | Confirms crop was actually planted |
| 5 | **Bank Passbook / Cancelled Cheque** | Mandatory | PDF/JPG | 2MB | For payout transfer |
| 6 | **Geo-tagged Loss Photographs** | Mandatory (min 3) | JPG/HEIC | 10MB each | Visual evidence of damage |
| 7 | **IMD / Gram Panchayat Letter** | If available | PDF/JPG | 5MB | External corroboration of calamity |
| 8 | **Crop Sown Certificate** | Mandatory if no RTC | PDF/JPG | 3MB | Required when RTC doesn't show current crop |
| 9 | **Pesticide Purchase Bill** | If pest/disease claim | PDF/JPG | 2MB | Proves attempted pest control |
| 10 | **Hospital/Lab Report (crop disease)** | If disease claim | PDF | 5MB | Agronomist or KVK lab confirmation |
| 11 | **Revenue Officer Letter / Patwari Certification** | For delayed filing | PDF | 3MB | Supports late intimation justification |
| 12 | **Video Evidence** | Optional but preferred | MP4 | 50MB | Strongest visual evidence |

**UI for document upload:**
- Each document slot shows: Name, Required badge, Format & size info, Upload zone (drag-and-drop or click)
- Uploaded file shows: filename, size, upload success tick, "Remove" button
- Mandatory slots not filled = "Register & Get OTP" button disabled
- For geo-tagged photos: mobile browser requests location permission; coordinates embedded in metadata and verified server-side

### Step 4: Photo & Video Evidence
Dedicated step for visual evidence (separated from documents for focus):
- Drag-and-drop upload zone
- Minimum 3 geo-tagged photos required
- Photos must be taken within 5km of registered farm coordinates (GPS validation)
- If GPS mismatch > 5km: warning shown, farmer must confirm or retake
- Video upload optional (MP4, max 50MB, 2 minutes max)
- AI pre-screening: basic blur detection, darkness check, file integrity check

### Step 5: Review & Confirm
Full summary of all entered data and uploaded documents. Farmer reads and checks three confirmation boxes:
1. "I confirm all information provided is true and accurate"
2. "I understand that false claims are punishable under IPC Section 420"
3. "I consent to satellite and remote sensing data being used in the assessment"

Then clicks "Submit Claim". A unique Claim Reference Number is generated immediately (format: `BHV-2026-KA-XXXXXX`).

### Step 6: Confirmation
- Claim reference number displayed prominently
- SMS sent to registered mobile
- Timeline shown: "What happens next?"
  1. Document Review (48 hours) → Admin
  2. Satellite Analysis (automated, 24 hours) → GEE pipeline
  3. Fraud Scoring (automated, real-time) → C++ engine
  4. Field Visit if required (3–7 days) → flagged by admin if fraud score 61–80
  5. Decision (within 15 days as per PMFBY guidelines)
  6. Payment (within 7 days of approval)

### Claim Routing by Fraud Score (C++ Engine Decision)

| Fraud Score | Risk Level | Routing | Action |
|-------------|-----------|---------|--------|
| 0 – 30 | Low | Auto-Approve Queue | Admin gets approval suggestion |
| 31 – 60 | Medium | Review Queue | Admin manually reviews documents |
| 61 – 80 | High | Field Visit Queue | Admin schedules physical verification |
| 81 – 100 | Critical | Auto-Reject Queue | Admin gets rejection suggestion + fraud flag |

***

## 9. Admin Panel — All Tabs, Full Detail

The admin panel is the single control center for the entire system. It has **12 tabs**. Each tab is fully specified below.

### Tab 1: Dashboard (Overview)

**What it is:** The landing page of the admin panel. Gives a real-time health overview of the entire system.

**Why it exists:** Admin needs to know at a glance: how many claims are pending, how many are fraud-flagged, satellite pipeline status, and system health — before diving into individual tabs.

**UI Layout:**
- Top row: 6 KPI cards
  - Total Farmers Registered
  - Claims This Season
  - Claims Pending Review
  - High Fraud Alerts (fraud score > 70)
  - Total Payouts Released (₹)
  - System Health (green/yellow/red)
- Middle row: 2 charts side by side
  - Claims by Status (donut chart)
  - Fraud Score Distribution (histogram: 0–30, 31–60, 61–80, 81–100 buckets)
- Bottom row: 2 feed widgets
  - Recent Activity (last 20 actions across all users)
  - Satellite Pipeline Status (GEE jobs running, last NDVI refresh times)

**Data sources:** Real-time from DB + Redis counters for KPIs, Recharts for charts.

***

### Tab 2: Farmer Management

**What it is:** Complete directory and management interface for all registered farmers.

**Why it exists:** Admin must verify new farmers, approve/reject their land documents, manage their accounts, and trace any farmer's full history.

**UI Layout:**
- Search bar + filters (State, District, Verification Status, Registration Date)
- Data table columns: Farmer ID | Name | Mobile | Village | District | Registered | Verification Status | Land Area | Claims Count | Actions
- Verification Status badges: Pending Verification / Verified / Rejected / Suspended
- Row expand: shows uploaded documents with view/download + approve/reject buttons
- "Export CSV" button for reporting
- Bulk action: Approve Selected / Reject Selected

**Functions:**
1. **Verify Farmer** — Admin views uploaded RTC, Aadhaar, passbook. Checks KGIS verification status. Approves or rejects with reason note. On approval: farmer notified via SMS.
2. **Suspend Farmer** — Temporarily block all claim filing (fraud investigation mode).
3. **View Full Profile** — Opens farmer detail page with: personal info, land record, all claims history, satellite reports, fraud score history, document vault.
4. **Reset Mobile** — In case farmer loses phone, admin can update mobile after ID re-verification.
5. **Download Documents** — Admin can download all submitted documents for a farmer as a ZIP.

***

### Tab 3: Claims Management

**What it is:** The primary claims workflow management interface.

**Why it exists:** Every claim must be reviewed, fraud-scored, and routed. Admin manages the entire pipeline from submission to payment from this tab.

**UI Layout:**
- Filter bar: Status | Fraud Score Band | Season | State | Date Range | Crop Type
- Claims table: Claim No. | Farmer | Village | Crop | Loss Type | Filed | Fraud Score | Status | Amount Claimed | Actions
- Fraud score shown as colored pill: green (<30), yellow (31–60), orange (61–80), red (>80)
- Row expand: shows complete claim with all documents, satellite report, fraud score breakdown

**Functions per claim:**
1. **Document Review** — Side-by-side document viewer with checklist. Admin checks each uploaded document and marks: Valid / Invalid / Needs Resubmission. Notes field for feedback.
2. **View Satellite Report** — Shows GEE-generated NDVI chart for the farmer's plot, SAR flood detection result, IMD weather at time of loss, FIRMS fire alerts. All real-time data displayed.
3. **View Fraud Score Breakdown** — Shows C++ engine output: total score + breakdown of all contributing factors (NDVI mismatch, historical pattern, amount inflation, geo-clustering, etc.)
4. **Approve Claim** — Enter approved amount (auto-suggested = claimed amount × (1 - loss_dispute_factor)). Add approval notes. Triggers payment processing.
5. **Reject Claim** — Select rejection reason from PMFBY standard list. Add notes. Triggers farmer notification.
6. **Flag for Field Visit** — Add note. Claim moves to Field Visit queue. In V7, this is a note only (no officer assignment since officers removed); admin documents that field visit was done via uploaded report.
7. **Request Additional Documents** — Select which documents are insufficient, type message. Farmer notified to resubmit.
8. **Flag as Fraud** — Claim marked with FRAUD flag. Farmer's account enters investigation mode. All future claims from this farmer get +30 fraud score automatically.

***

### Tab 4: Satellite Analytics

**What it is:** Real-time and historical satellite intelligence dashboard for all enrolled farms.

**Why it exists:** Satellite data is the core fraud-detection mechanism. Admin needs a map-based overview of all farms, their NDVI health, and anomalies — especially before and after reported damage events.

**UI Layout:**
- Full-screen Leaflet map showing all enrolled farms as map markers
- Marker colors: Green (NDVI > 0.5), Yellow (0.3–0.5), Orange (0.15–0.3), Red (<0.15)
- Click any marker: shows NDVI value, last scan date, farm details, active claims
- Timeline slider: scrub through past 12 months of NDVI data
- Sidebar filters: District, Crop Type, Claims Active, Fraud Flagged
- Below map: sortable table of farms ranked by NDVI anomaly score
  - "Anomaly Score" = deviation of current NDVI from seasonal baseline for that crop+region

**Functions:**
1. **NDVI Comparison Tool** — Select two time points, see before/after NDVI side by side for any farm
2. **Flood Overlay** — Toggle SAR-detected flood zones over map
3. **Fire Alerts Layer** — Toggle NASA FIRMS hotspot layer
4. **Bulk NDVI Refresh** — Trigger GEE refresh for all farms in a district (queued async job)
5. **Export Satellite Report** — Download PDF satellite report for a specific claim/farm
6. **Anomaly Alert Config** — Set NDVI drop threshold (default: 0.25 drop over 14 days triggers alert)

***

### Tab 5: Fraud Intelligence

**What it is:** Dedicated fraud analysis dashboard showing all fraud-scored claims and patterns.

**Why it exists:** Fraud is the primary purpose of the system. Admin needs to identify patterns, investigate flagged claims, and understand which fraud vectors are most active.

**UI Layout:**
- Top: 4 fraud KPI cards — Claims Flagged Today | Total Fraud Prevented (₹) | Avg Fraud Score This Season | High-Risk Farmers Count
- Fraud Score Distribution chart (histogram)
- Top 10 Highest-Risk Claims table (sortable)
- Fraud Pattern Analysis:
  - Geo-clustering map (circles showing areas with multiple high-fraud claims)
  - Repeat Claimants table (farmers with >2 high-score claims)
  - Fraud Factor Frequency chart (which C++ engine factors trigger most often)

**Functions:**
1. **Investigate Claim** — Deep-dive view: all C++ engine factor scores, full satellite history, document analysis result, farmer claim history
2. **Compare Claims** — Select two claims and see side-by-side comparison of all fraud factors
3. **Geo-Cluster Drill-Down** — Click a cluster on map → see all claims from that area, farmer names, amounts
4. **Block Farmer** — Permanently flag farmer for fraud; blocks future claims; creates police complaint draft
5. **Export Fraud Report** — PDF report of all fraud flags for a season (for Ministry submission)
6. **Fraud Threshold Config** — Admin can adjust C++ engine thresholds: weight of each factor, band boundaries (0-30/31-60/61-80/81-100)

***

### Tab 6: Payments & Disbursement

**What it is:** Tracks all claim payments from approval to farmer bank account.

**Why it exists:** PMFBY requires strict audit trail for every rupee paid. Admin must monitor payment processing, handle failures, and generate disbursement reports for the Ministry.

**UI Layout:**
- Filter: Date Range | Status | District | Batch
- Table: Payment ID | Claim No. | Farmer | Amount | Bank Account (masked) | Status | Initiated | Settled
- Payment Status badges: Queued / Processing / Settled / Failed / Reversed
- Summary bar: Total Queued (₹) | Total Processing | Total Settled This Month

**Functions:**
1. **Initiate Batch Payment** — Group approved claims by district and initiate NACH batch transfer
2. **View Payment Detail** — Shows NPCI transaction ID, bank confirmation, timestamps
3. **Retry Failed Payment** — For bounced/failed transfers, admin retries after updating bank details
4. **Generate Disbursement Report** — Ministry-format PDF/Excel of all payments in a period
5. **Payment Hold** — Place a hold on a payment (if fraud investigation starts post-approval)
6. **Export to DFI** — Export payment file in NCIP/DFI format for bank integration

***

### Tab 7: Document Vault

**What it is:** Centralized storage and management interface for all farmer-uploaded documents.

**Why it exists:** All uploaded RTC, Aadhaar, passbooks, claim photos, and evidence files are stored in MinIO S3. Admin needs to browse, verify, and manage these documents.

**UI Layout:**
- Search by Farmer Name / ID / Document Type
- Document type filter: RTC | Aadhaar | Passbook | Claim Photos | Field Reports | Sowing Certificates
- Grid view with document thumbnails and metadata (upload date, file size, verification status)
- Row select + bulk verify/reject

**Functions:**
1. **View Document** — Open in secure full-screen viewer (PDF viewer / image lightbox)
2. **Verify Document** — Mark as Authentic / Suspected Forgery / Resubmission Required
3. **OCR Extract** — Run OCR on RTC to extract survey number, area, owner name and cross-check with farmer profile
4. **Delete Document** — Soft-delete with audit trail (actually archived, not destroyed)
5. **Storage Analytics** — Total storage used, by document type, by state/district
6. **Retention Policy** — Configure auto-archive after N years per document type

***

### Tab 8: Notifications & Alerts

**What it is:** Management interface for all system-generated notifications sent to farmers and admin alerts.

**Why it exists:** Admin must monitor what notifications are being sent (or failing), configure alert thresholds, and broadcast mass notifications (e.g., scheme deadline reminders).

**UI Layout:**
- Two sub-tabs: **Sent Log** | **Alert Config**
- Sent Log table: Recipient | Type | Message Preview | Channel (SMS/App) | Status | Sent At
- Alert Config: list of alert types with toggle on/off, threshold settings, message templates

**Functions:**
1. **Send Broadcast** — Send SMS + in-app notification to all farmers in a state/district (e.g., "Claim deadline in 5 days")
2. **View Notification Detail** — Full notification content + delivery status (delivered/failed/pending)
3. **Configure NDVI Alert Threshold** — Set NDVI drop level that auto-triggers "Bhumi AI Alert" notification to farmer
4. **Configure Fraud Alert** — Set score threshold that auto-alerts admin team
5. **SMS Template Editor** — Edit templates for all notification types in English + regional languages
6. **Failed Notification Retry** — Retry delivery for failed SMS/app notifications

***

### Tab 9: User Management

**What it is:** Full CRUD interface for all system users (Farmers + Admin accounts).

**Why it exists:** Admin must manage accoun

### Tab 9: User Management

**What it is:** Full CRUD interface for all system users (Farmers + Admin accounts).

**Why it exists:** Admin must manage account lifecycle, unlock locked accounts, reset 2FA, and maintain user security.

**UI Layout:**
- Role filter: All | Farmers | Admins
- Table: User ID | Name | Mobile | Role | Status | 2FA | Last Login | Failed Logins | Actions
- Status badges: Active / Locked / Suspended / Pending Verification

**Functions:**
1. **View User Detail** — Full user profile with login history, IP log, all actions
2. **Create Admin Account** — Add a new admin user (only super-admin can do this)
3. **Lock / Unlock Account** — Manual lock or unlock (overrides auto-lock)
4. **Reset 2FA** — Generate new TOTP secret for user (when phone lost)
5. **Force Password Reset** — Send reset link to registered mobile
6. **Suspend User** — Prevent all login; used for fraud investigation
7. **Delete User** — Soft delete (anonymize PII, retain audit records)
8. **Export Users** — CSV export of all users for reporting

***

### Tab 10: Audit Logs

**What it is:** Immutable log of every action taken in the system, by every user.

**Why it exists:** PMFBY compliance and government audit requirements mandate complete traceability. Every approval, rejection, document access, and config change must be logged with who did it, when, and from where.

**UI Layout:**
- Filter: User | Action Type | Resource | Date Range | IP Address
- Table: Timestamp | User | Role | Action | Resource | Resource ID | IP | Status
- No Edit / Delete buttons anywhere on this page (logs are read-only)
- Export to CSV / PDF for audit submission

**Action types logged:**
- farmer.register, farmer.verify, farmer.suspend
- claim.submit, claim.approve, claim.reject, claim.flag_fraud
- document.view, document.verify, document.delete
- payment.initiate, payment.retry
- config.update, user.create, user.delete, user.unlock
- satellite.refresh, admin.login, admin.logout

**Functions:**
1. **Search by Resource ID** — Find all actions on a specific claim/farmer/payment
2. **User Activity Timeline** — All actions by a specific user in chronological order
3. **Export Audit Report** — Ministry-format audit trail PDF for a date range
4. **Anomaly Detection** — Highlight unusual activity (bulk document downloads, off-hours logins, rapid state changes)

***

### Tab 11: System Configuration

**What it is:** Runtime configuration panel for all system parameters.

**Why it exists:** Parameters like fraud score thresholds, rate limits, feature flags, satellite refresh intervals, and PMFBY season dates must be adjustable without code deployment.

**UI Layout:**
- Grouped accordion sections: Fraud Engine | Satellite | Auth & Security | PMFBY Seasons | Notifications | System

**Configurable Parameters:**

| Section | Parameter | Default | Description |
|---------|-----------|---------|-------------|
| Fraud Engine | auto_approve_threshold | 30 | Claims below this score suggested for auto-approval |
| Fraud Engine | review_threshold | 60 | Claims above this need manual review |
| Fraud Engine | field_visit_threshold | 80 | Claims above this need field investigation |
| Fraud Engine | auto_reject_threshold | 80 | Claims above this suggested for auto-reject |
| Fraud Engine | historical_claim_weight | 0.20 | Weight of historical fraud in total score |
| Fraud Engine | ndvi_mismatch_weight | 0.25 | Weight of NDVI anomaly in total score |
| Satellite | ndvi_cache_ttl_hours | 6 | How long to cache NDVI data in Redis |
| Satellite | ndvi_alert_drop_threshold | 0.25 | NDVI drop that triggers farmer alert |
| Satellite | gee_timeout_seconds | 8 | Max time to wait for GEE response |
| Satellite | cloud_cover_max_pct | 20 | Max cloud cover to accept in Sentinel-2 scene |
| Auth | otp_ttl_minutes | 5 | OTP expiry time |
| Auth | max_failed_logins | 5 | Failed attempts before account lock |
| Auth | lock_duration_minutes | 30 | Account lock duration |
| Auth | access_token_ttl_minutes | 30 | JWT access token lifetime |
| PMFBY | kharif_cutoff_date | 2026-07-31 | Last date to enroll for Kharif |
| PMFBY | rabi_cutoff_date | 2026-12-15 | Last date to enroll for Rabi |
| PMFBY | claim_intimation_hours | 72 | Hours within which claim must be filed |
| PMFBY | max_payment_days | 7 | Days to disburse after approval |
| System | rate_limit_per_minute | 60 | API rate limit per IP |
| System | max_upload_size_mb | 50 | Maximum single file upload size |

**Functions:**
1. **Edit Parameter** — Click any value, edit inline, save
2. **View Change History** — Each parameter shows last changed by / when
3. **Revert to Default** — Reset any parameter to system default
4. **Test Config** — Dry-run fraud scoring with new thresholds on a sample claim

***

### Tab 12: System Health

**What it is:** Real-time infrastructure monitoring dashboard.

**Why it exists:** Admin must know if the database, Redis, GEE pipeline, satellite jobs, or file storage are degraded — before farmers start reporting issues.

**UI Layout:**
- Traffic light status board at top: each service gets a green/yellow/red indicator
- Service cards: PostgreSQL | Redis | GEE Pipeline | MinIO | IMD API | FIRMS API | UIDAI API | NPCI API
- Each card shows: Status | Latency (ms) | Last Checked | Uptime % (24h)
- Charts: API response time trends (24h line charts)
- Alert log: Recent service degradations

**Services Monitored:**

| Service | Health Check Method | Unhealthy Threshold |
|---------|-------------------|---------------------|
| PostgreSQL | SELECT 1 query, measure latency | > 200ms or connection refused |
| Redis | PING command | > 50ms or PONG not received |
| GEE Pipeline | Test ee.Number(1).getInfo() | > 5000ms or exception |
| MinIO S3 | List buckets API | > 500ms or 5xx |
| IMD API | Fetch test district data | > 3000ms or non-200 |
| FIRMS API | Fetch test area | > 5000ms or non-200 |
| C++ Fraud Engine | Run test score with sample JSON | > 100ms or non-zero exit |

**Functions:**
1. **Force Health Check** — Manually trigger all health checks now
2. **View Error Logs** — Last 100 error log lines from each service
3. **Restart Service** — (if deployed with Docker) Restart individual containers
4. **DB Performance** — Show slow query log, active connections, table sizes
5. **GEE Job Queue** — List pending/running/completed satellite jobs
6. **Cache Stats** — Redis memory usage, key count, hit/miss ratio

***

## 10. Database Schema Changes (V7)

The V7 schema removes all intermediate-role tables and adds new V7-specific tables.

### Removed Tables (V6 → V7)
- `inspections` — field officer inspection reports (officer role removed)
- Role-specific tables for state_dc, insurer

### Modified Table: `users`
```sql
-- Role ENUM simplified from 5 to 2
ALTER TYPE user_role RENAME TO user_role_v6;
CREATE TYPE user_role AS ENUM ('farmer', 'admin');
ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
```

### New Table: `satellite_reports`
```sql
CREATE TABLE satellite_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID REFERENCES farmers(id),
  claim_id        UUID REFERENCES claims(id) NULL,
  ndvi_value      DECIMAL(6,4),
  ndvi_label      VARCHAR(20),
  ndvi_source     VARCHAR(100) DEFAULT 'Sentinel-2 SR Harmonized',
  flood_detected  BOOLEAN DEFAULT false,
  flood_area_sqm  DECIMAL(12,2),
  fire_detected   BOOLEAN DEFAULT false,
  fire_hotspots   INT DEFAULT 0,
  imd_condition   VARCHAR(50),
  imd_rainfall_mm DECIMAL(8,2),
  last_scan_date  DATE,
  cloud_cover_pct DECIMAL(5,2),
  is_live         BOOLEAN DEFAULT true,
  gee_job_id      VARCHAR(100),
  raw_response    JSONB,
  computed_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sat_farmer ON satellite_reports(farmer_id);
CREATE INDEX idx_sat_computed ON satellite_reports(computed_at DESC);
```

### New Table: `claim_documents`
```sql
CREATE TABLE claim_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID REFERENCES claims(id),
  farmer_id       UUID REFERENCES farmers(id),
  doc_type        VARCHAR(100) NOT NULL,  -- 'aadhaar', 'rtc', 'passbook', 'photo', 'video', 'sowing_cert', etc.
  file_path       VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT,
  mime_type       VARCHAR(100),
  gps_lat         DECIMAL(10,7),
  gps_lng         DECIMAL(10,7),
  verification_status VARCHAR(20) DEFAULT 'pending',  -- pending/verified/rejected/needs_resubmit
  verified_by     UUID REFERENCES users(id) NULL,
  verified_at     TIMESTAMP,
  admin_notes     TEXT,
  uploaded_at     TIMESTAMP DEFAULT NOW()
);
```

### New Table: `farm_registrations`
```sql
CREATE TABLE farm_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID REFERENCES farmers(id),
  survey_number   VARCHAR(100) NOT NULL,
  state           VARCHAR(100) NOT NULL,
  district        VARCHAR(100) NOT NULL,
  taluk           VARCHAR(100) NOT NULL,
  hobli           VARCHAR(100),
  village         VARCHAR(100) NOT NULL,
  land_area_ha    DECIMAL(10,4) NOT NULL,
  ownership_type  VARCHAR(20) DEFAULT 'owner',  -- owner/tenant/sharecropper
  kgis_verified   BOOLEAN DEFAULT false,
  kgis_data       JSONB,
  aadhaar_seeded  BOOLEAN DEFAULT false,
  geo_centroid    POINT,
  verification_status VARCHAR(20) DEFAULT 'pending',
  admin_notes     TEXT,
  registered_at   TIMESTAMP DEFAULT NOW()
);
```

### New Table: `carbon_credits`
```sql
CREATE TABLE carbon_credits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id       UUID REFERENCES farmers(id),
  season          VARCHAR(20),
  year            INT,
  credits_earned  DECIMAL(10,4),
  value_inr       DECIMAL(12,2),
  certification   VARCHAR(50),  -- VERRA/Gold Standard/pending
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT NOW()
);
```

***

## 11. Backend API Reference (V7)

### Auth Endpoints
```
POST /api/v1/auth/register           — Farmer self-registration Step 1 initiation
POST /api/v1/auth/verify-otp         — Verify registration OTP
POST /api/v1/auth/login              — Farmer or Admin login
POST /api/v1/auth/refresh            — Rotate access token
POST /api/v1/auth/logout             — Blacklist token
POST /api/v1/auth/forgot-password    — Send reset OTP
POST /api/v1/auth/reset-password     — Reset with OTP
```

### Farmer Endpoints
```
GET    /api/v1/farmer/profile        — Get own profile
PUT    /api/v1/farmer/profile        — Update profile
GET    /api/v1/farmer/dashboard      — Dashboard stats + satellite report
GET    /api/v1/farmer/land           — Land registration details
PUT    /api/v1/farmer/land           — Update land details
POST   /api/v1/farmer/land/verify-kgis — Trigger KGIS verification
GET    /api/v1/farmer/policies       — Active policies
GET    /api/v1/farmer/claims         — All claims
POST   /api/v1/farmer/claims         — Start new claim (Step 1)
PUT    /api/v1/farmer/claims/{id}    — Update draft claim
POST   /api/v1/farmer/claims/{id}/documents — Upload claim documents
POST   /api/v1/farmer/claims/{id}/photos    — Upload geo-tagged photos
POST   /api/v1/farmer/claims/{id}/submit    — Final submit
GET    /api/v1/farmer/notifications  — Notification list
PUT    /api/v1/farmer/notifications/{id}/read — Mark read
GET    /api/v1/farmer/carbon-credits — Carbon credits balance
```

### Satellite Endpoints
```
GET /api/v1/satellite/farm-report    — Complete satellite report for logged-in farmer
GET /api/v1/satellite/ndvi           — NDVI for specific coordinates
GET /api/v1/satellite/flood          — SAR flood detection
GET /api/v1/satellite/fire           — NASA FIRMS fire alerts
GET /api/v1/satellite/weather        — IMD weather for district
GET /api/v1/satellite/ndvi-history   — 12-month NDVI time series for plot
POST /api/v1/satellite/refresh       — Force GEE refresh (Admin only)
```

### Admin Endpoints
```
GET  /api/v1/admin/dashboard         — All KPI stats
GET  /api/v1/admin/farmers           — Paginated farmer list
GET  /api/v1/admin/farmers/{id}      — Farmer detail
PUT  /api/v1/admin/farmers/{id}/verify — Approve/reject farmer verification
PUT  /api/v1/admin/farmers/{id}/suspend — Suspend farmer
GET  /api/v1/admin/claims            — All claims with filters
GET  /api/v1/admin/claims/{id}       — Full claim detail
PUT  /api/v1/admin/claims/{id}/approve — Approve with amount
PUT  /api/v1/admin/claims/{id}/reject  — Reject with reason
PUT  /api/v1/admin/claims/{id}/field-visit — Mark field visit required
PUT  /api/v1/admin/claims/{id}/fraud-flag  — Flag as fraud
POST /api/v1/admin/claims/{id}/request-docs — Request resubmission
GET  /api/v1/admin/satellite/map     — All farms with latest NDVI for map
GET  /api/v1/admin/fraud/dashboard   — Fraud intelligence stats
GET  /api/v1/admin/fraud/top-claims  — Top 50 highest fraud score claims
GET  /api/v1/admin/payments          — Payment list
POST /api/v1/admin/payments/batch    — Initiate batch payment
GET  /api/v1/admin/documents         — Document vault
GET  /api/v1/admin/notifications     — Notification log
POST /api/v1/admin/notifications/broadcast — Send broadcast
GET  /api/v1/admin/users             — User management
GET  /api/v1/admin/audit-logs        — Audit log
GET  /api/v1/admin/config            — System config
PUT  /api/v1/admin/config            — Update config
GET  /api/v1/admin/health            — System health check
```

***

## 12. Frontend Pages & Components

### Farmer Portal Routes
```
/register                — 4-step registration wizard
/login                   — Login page
/farmer/dashboard        — Overview tab (default)
/farmer/land             — My Land tab
/farmer/claims           — My Claims tab
/farmer/claims/new       — File New Claim (6-step wizard)
/farmer/claims/:id       — Claim Detail + Timeline
/farmer/carbon           — Carbon Credits tab
/farmer/notifications    — Notifications tab
/farmer/profile          — Profile & Settings
```

### Admin Portal Routes
```
/admin/login             — Admin login
/admin/dashboard         — Overview tab
/admin/farmers           — Farmer Management tab
/admin/farmers/:id       — Farmer Detail
/admin/claims            — Claims Management tab
/admin/claims/:id        — Claim Detail (admin view)
/admin/satellite         — Satellite Analytics tab
/admin/fraud             — Fraud Intelligence tab
/admin/payments          — Payments tab
/admin/documents         — Document Vault tab
/admin/notifications     — Notifications tab
/admin/users             — User Management tab
/admin/audit             — Audit Logs tab
/admin/config            — System Config tab
/admin/health            — System Health tab
```

### Key Shared Components
- `FarmerRegistrationWizard` — 4-step stepper (matches reference screenshots)
- `ClaimFilingWizard` — 6-step guided claim form
- `BhumiAICard` — Live NDVI gauge + satellite status (matches image 6)
- `LandRecordCard` — Verified land details (matches image 1)
- `DocumentUploadSlot` — Single document slot with drag-drop, preview, status
- `FraudScoreGauge` — Radial gauge 0–100 with color zones
- `NDVITimeSeriesChart` — Recharts line chart, 12-month history
- `SatelliteMap` — Leaflet map with farm markers colored by NDVI
- `AdminClaimDetailPanel` — Side panel with all claim info + admin actions
- `NotificationBell` — Header bell with unread count + dropdown

***

## 13. Notification & Alert System

### Notification Types & Triggers

| Type | Trigger | Recipient | Channel |
|------|---------|-----------|---------|
| registration_approved | Admin verifies farmer | Farmer | SMS + App |
| registration_rejected | Admin rejects with reason | Farmer | SMS + App |
| claim_submitted | Farmer submits claim | Farmer + Admin | App |
| claim_doc_review | Admin starts document review | Farmer | App |
| claim_docs_requested | Admin requests resubmission | Farmer | SMS + App |
| claim_approved | Admin approves claim | Farmer | SMS + App |
| claim_rejected | Admin rejects claim | Farmer | SMS + App |
| payment_initiated | Payment batch started | Farmer | App |
| payment_settled | NACH confirms transfer | Farmer | SMS + App |
| ndvi_alert | NDVI drops below threshold | Farmer | SMS + App |
| flood_detected | SAR detects flooding near farm | Farmer + Admin | SMS + App |
| fire_alert | FIRMS detects fire near farm | Farmer + Admin | SMS + App |
| fraud_flag | C++ score > 70 | Admin only | App |
| claim_deadline | 5 days before cutoff date | All farmers | SMS |

### SMS Provider
- Primary: MSG91 (production)
- Fallback: Twilio (if MSG91 fails)
- Development: Log to console only

***

## 14. Security & Compliance

### Authentication
- JWT access tokens (30 min) + refresh tokens (7 days)
- Token blacklisting via Redis on logout
- TOTP 2FA available (strongly recommended for Admin)
- Account lock after 5 failed attempts (30 min)
- All auth events logged to audit_logs

### Data Privacy (PDPA / IT Act compliance)
- Aadhaar number stored masked (last 4 digits visible): `XXXX-XXXX-1234`
- Bank account stored partially masked: `XXXXX1234`
- Full values encrypted at rest with AES-256
- UIDAI API called only for OTP — Aadhaar biometric/database not accessed
- Right to deletion: on farmer request, PII anonymized (records kept for 7 years per PMFBY audit requirement)

### File Storage Security
- All uploads stored in MinIO S3 (private bucket)
- Files served via signed URLs with 15-minute expiry
- Virus scanning on all uploads (ClamAV)
- EXIF data stripped from photos (except GPS coordinates on claim evidence)

### API Security
- Rate limiting: 60 req/min general, 5 req/min for auth endpoints
- CORS restricted to production domain only
- All endpoints use HTTPS in production
- SQL injection prevention via SQLAlchemy ORM parameterized queries
- Input sanitization on all user-submitted text fields

***

## 15. Build Order & Deployment

### V7 Build Sequence

1. Update DB schema (Alembic migration: simplify roles, add new tables)
2. Update auth service (remove 3 roles, keep farmer + admin)
3. Build farmer self-registration API (4-step + KGIS + UIDAI + bank verify)
4. Build real GEE satellite service (NDVI + SAR + IMD + FIRMS)
5. Build claim documents service (upload + OCR + verification)
6. Build complete claim filing API (6-step wizard, 72-hour rule, fraud score)
7. Build all 12 admin panel tabs (API + frontend)
8. Build frontend farmer registration wizard (matches reference screenshots)
9. Build Bhumi AI Intelligence card (real GEE data)
10. Build farmer dashboard (5 tabs)
11. Build claim filing wizard (6 steps)
12. Build admin panel (12 tabs)
13. Connect notification system
14. Run seed data for 2-role system
15. E2E test: register → verify → file claim → fraud score → admin review → pay

### Environment Requirements
```
PostgreSQL 16+
Redis 7+
Python 3.11+
Node.js 20+
Google Earth Engine service account
MinIO or AWS S3
Docker + Docker Compose (recommended)
```

### Monitoring (Production)
- Prometheus + Grafana for API metrics
- Sentry for error tracking (frontend + backend)
- GEE job health monitored via /admin/health endpoint
- Daily automated satellite refresh cron job: 02:00 IST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BHUVIGYAN V7 — FIELD INSPECTOR PORTAL
Complete Spec: Role · Backend · Frontend · DB · API · Mobile UX
Stack: FastAPI · PostgreSQL · React · TypeScript · Tailwind
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════════════════════════════════════════
PART 0: WHY FIELD INSPECTOR EXISTS IN V7
═══════════════════════════════════════════════════════════════

The admin cannot physically visit every farm. When the C++ fraud
engine scores a claim between 61–80 (High Risk), a field inspection
is MANDATORY under PMFBY guidelines. The Field Inspector is:

  - A government-appointed ground-level officer
  - Assigned to specific districts/taluks
  - Executes physical farm visits for high-risk claims
  - Conducts Crop Cutting Experiments (CCE) for yield estimation
  - Submits GPS-verified, photo-backed inspection reports
  - Cannot approve or reject claims — only submits evidence
  - All their reports feed back into the Admin panel for final decision

This is the ONLY role apart from Farmer and Admin. The satellite is
the primary verification layer. The Field Inspector is the secondary
physical verification layer for cases satellite cannot resolve alone.

KEY DIFFERENCE FROM V6:
  - V6: Officer could be bribed (VAO loophole) — reports were manual
  - V7: Inspector's GPS coordinates, photos, and NDVI are all
    cross-validated in real-time. If inspector submits from wrong
    location or crops don't match satellite data → system flags it.
  - Inspector CANNOT override satellite. Their report is EVIDENCE,
    not the final word. Admin + C++ engine makes the final call.

═══════════════════════════════════════════════════════════════
PART 1: ROLE DEFINITION
═══════════════════════════════════════════════════════════════

Role Name:   field_inspector
Created by:  Admin only (not self-registerable)
Scope:       Assigned to 1–5 districts by Admin
Access:      Inspector portal only (/inspector/*)

Inspector Profile (stored in DB):
  - Full name, employee ID, mobile, state, district(s) assigned
  - Department (Agriculture Dept / Revenue Dept / Insurance Company)
  - Badge number
  - Active visits count
  - Completion rate (%)
  - Fraud detection accuracy (%)

Seed Credentials:
  Inspector 1:  mobile: 9700000001  password: Insp@2026
  Inspector 2:  mobile: 9700000002  password: Insp@2026
  Inspector 3:  mobile: 9700000003  password: Insp@2026

═══════════════════════════════════════════════════════════════
PART 2: WHEN A FIELD VISIT IS TRIGGERED
═══════════════════════════════════════════════════════════════

Field visit is assigned when ANY of these conditions are true:

  Condition A: C++ fraud score between 61–80 (High Risk band)
  Condition B: NDVI contradicts claimed loss by > 30%
               (e.g. NDVI = 0.65 "Good" but farmer claims 80% loss)
  Condition C: Claimed area > 2x the KGIS-verified land area
  Condition D: Multiple claims from same GPS coordinates (geo-cluster)
  Condition E: Farmer's historical fraud rate > 40%
  Condition F: Claim amount > ₹5,00,000 (any claim this large)
  Condition G: SAR flood detected but farmer claims drought loss
               (or vice versa — calamity type mismatch)
  Condition H: Admin manually assigns field visit (override)

When triggered:
  1. Claim status → "Field Visit Required"
  2. Admin selects an inspector from their district pool
  3. Inspector receives SMS + app notification immediately
  4. Farmer receives SMS: "A field inspector will visit your farm
     within 3–7 working days. Please be available."
  5. Inspector has 7 days to complete and submit the report

═══════════════════════════════════════════════════════════════
PART 3: DATABASE SCHEMA
═══════════════════════════════════════════════════════════════

TABLE: field_inspectors
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE
  full_name         VARCHAR(255) NOT NULL
  employee_id       VARCHAR(50) UNIQUE NOT NULL
  department        VARCHAR(100)        -- "Agriculture Dept" / "Revenue" / "Insurer"
  badge_number      VARCHAR(50)
  districts_assigned JSONB DEFAULT '[]' -- ["Bengaluru Rural", "Tumkur"]
  state             VARCHAR(100) NOT NULL
  is_active         BOOLEAN DEFAULT true
  total_visits      INT DEFAULT 0
  completed_visits  INT DEFAULT 0
  created_at        TIMESTAMP DEFAULT NOW()

TABLE: field_visits
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  claim_id          UUID REFERENCES claims(id)
  farmer_id         UUID REFERENCES farmers(id)
  inspector_id      UUID REFERENCES field_inspectors(id)
  assigned_by       UUID REFERENCES users(id)    -- admin who assigned
  trigger_reason    VARCHAR(100) NOT NULL         -- "fraud_score_61_80" / "ndvi_mismatch" / "manual" / etc.
  fraud_score_at_assignment DECIMAL(5,2)          -- score when visit was triggered
  visit_type        ENUM('inspection','cce_visit','fraud_investigation') NOT NULL
  status            ENUM('assigned','acknowledged','in_progress','submitted','verified') DEFAULT 'assigned'
  due_date          DATE NOT NULL                 -- assigned_date + 7 days
  scheduled_date    DATE                          -- inspector sets this
  visit_start_time  TIMESTAMP
  visit_end_time    TIMESTAMP
  gps_start_lat     DECIMAL(10,7)
  gps_start_lng     DECIMAL(10,7)
  gps_end_lat       DECIMAL(10,7)
  gps_end_lng       DECIMAL(10,7)
  distance_from_farm_m INT                        -- calculated: GPS vs registered farm centroid
  gps_verified      BOOLEAN DEFAULT false         -- true if within 200m of registered farm
  assigned_at       TIMESTAMP DEFAULT NOW()
  acknowledged_at   TIMESTAMP
  submitted_at      TIMESTAMP

TABLE: field_inspection_reports
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  visit_id          UUID REFERENCES field_visits(id) UNIQUE
  claim_id          UUID REFERENCES claims(id)

  -- Crop Findings
  crop_found        BOOLEAN NOT NULL              -- was the claimed crop actually growing?
  crop_type_found   VARCHAR(100)                  -- actual crop observed
  crop_type_matches BOOLEAN                       -- matches claimed crop?
  crop_stage        VARCHAR(100)                  -- seedling/vegetative/flowering/maturity
  crop_condition    ENUM('healthy','mild_damage','moderate_damage',
                         'severe_damage','total_loss') NOT NULL
  actual_loss_pct   DECIMAL(5,2) NOT NULL         -- inspector's loss estimate
  claimed_loss_pct  DECIMAL(5,2)                  -- farmer's claimed loss (for comparison)
  discrepancy_pct   DECIMAL(5,2)                  -- |actual - claimed|

  -- Land Findings
  land_found        BOOLEAN NOT NULL              -- was farmland present at location?
  land_area_observed DECIMAL(10,4)               -- Ha observed by inspector
  land_area_claimed  DECIMAL(10,4)               -- farmer's claimed area
  area_discrepancy  DECIMAL(10,4)                -- difference in Ha

  -- CCE Data (if visit_type = cce_visit)
  cce_conducted     BOOLEAN DEFAULT false
  cce_plot_size_sqm DECIMAL(8,2)
  cce_yield_kg      DECIMAL(10,3)
  cce_estimated_yield_per_ha DECIMAL(10,3)
  threshold_yield   DECIMAL(10,3)                -- from PMFBY district notification
  cce_loss_pct      DECIMAL(5,2)                 -- derived from CCE data

  -- Weather Observations
  weather_at_visit  VARCHAR(100)                 -- sunny/cloudy/rainy/post-rain
  visible_water_damage BOOLEAN DEFAULT false
  visible_fire_damage  BOOLEAN DEFAULT false
  visible_pest_damage  BOOLEAN DEFAULT false
  visible_hail_damage  BOOLEAN DEFAULT false

  -- Inspector Assessment
  inspector_recommendation ENUM('approve','reject','partial_approve',
                                 'further_investigation') NOT NULL
  recommended_payout_pct DECIMAL(5,2)
  notes             TEXT
  fraud_suspicion   BOOLEAN DEFAULT false
  fraud_suspicion_reason TEXT

  -- Photos
  photos            JSONB DEFAULT '[]'            -- [{url, gps_lat, gps_lng, timestamp}]
  video_url         VARCHAR(500)

  -- Satellite Cross-check (auto-computed on submission)
  ndvi_at_visit     DECIMAL(6,4)                 -- live GEE pull at time of submission
  ndvi_matches_finding BOOLEAN                   -- does NDVI agree with inspector's loss %?
  satellite_flag    BOOLEAN DEFAULT false         -- system flags if inspector and sat disagree

  submitted_at      TIMESTAMP DEFAULT NOW()

TABLE: cce_plots (for CCE visits — detailed crop cutting records)
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
  visit_id          UUID REFERENCES field_visits(id)
  plot_number       INT NOT NULL                  -- 1,2,3 (multiple plots per visit)
  gps_lat           DECIMAL(10,7)
  gps_lng           DECIMAL(10,7)
  plot_size_sqm     DECIMAL(8,2)
  crop_cut_weight_kg DECIMAL(10,3)
  moisture_pct      DECIMAL(5,2)
  estimated_yield_kg_per_ha DECIMAL(10,3)
  photo_url         VARCHAR(500)
  recorded_at       TIMESTAMP DEFAULT NOW()

Add indexes:
  CREATE INDEX idx_visits_inspector ON field_visits(inspector_id);
  CREATE INDEX idx_visits_claim ON field_visits(claim_id);
  CREATE INDEX idx_visits_status ON field_visits(status);
  CREATE INDEX idx_visits_due ON field_visits(due_date);
  CREATE INDEX idx_reports_visit ON field_inspection_reports(visit_id);

═══════════════════════════════════════════════════════════════
PART 4: BACKEND — FASTAPI ENDPOINTS
═══════════════════════════════════════════════════════════════

─────────────────────────────────────────────────────────────
4.1 Inspector Auth & Profile
─────────────────────────────────────────────────────────────

POST  /api/v1/auth/login
  → Same shared login endpoint, role = 'field_inspector'
  → On login: redirect to /inspector/dashboard

GET   /api/v1/inspector/profile
  → Own profile: name, employee ID, districts, stats

PUT   /api/v1/inspector/profile
  → Update contact only (admin controls everything else)

─────────────────────────────────────────────────────────────
4.2 Visit Management
─────────────────────────────────────────────────────────────

GET   /api/v1/inspector/visits
  Query params: status, date_from, date_to, overdue
  → Returns all visits assigned to this inspector
  → Includes: farmer name, village, district, crop, claim amount,
    fraud score, due date, status, trigger reason
  → Sorted: overdue first, then by due_date ASC

GET   /api/v1/inspector/visits/{id}
  → Full visit detail:
    - Farmer profile (name, mobile, village, survey number)
    - Land record (RTC details, KGIS verification status)
    - Claim details (what was claimed, loss type, amount)
    - Farmer's uploaded evidence photos (can view)
    - Current NDVI value + chart for this plot (live GEE fetch)
    - SAR flood/fire status
    - IMD weather at the farm district
    - C++ fraud score breakdown (what triggered this visit)
    - Map showing: farm centroid (green pin) + GPS boundary

POST  /api/v1/inspector/visits/{id}/acknowledge
  Body: { scheduled_date: "2026-05-14" }
  → Inspector acknowledges assignment and sets visit date
  → Status: assigned → acknowledged
  → Farmer gets SMS: "Inspector will visit on [date]"
  → Admin gets notification

POST  /api/v1/inspector/visits/{id}/start
  Body: { gps_lat, gps_lng }
  → Inspector presses "Start Visit" on arrival
  → Status: acknowledged → in_progress
  → GPS coordinates recorded as visit_start
  → System validates: is inspector within 500m of registered farm?
    - Yes: proceed, show green "GPS Verified" tick
    - No: show warning "You are Xkm from registered farm location.
      Continue only if farm boundaries have changed."
      Inspector must confirm to proceed
  → Visit start timestamp recorded

DELETE /api/v1/inspector/visits/{id}/abandon
  Body: { reason }
  → Inspector couldn't reach farm (flooding, farmer absent, etc.)
  → Status → assigned (re-queued for reassignment)
  → Admin notified with reason

─────────────────────────────────────────────────────────────
4.3 Inspection Report Submission
─────────────────────────────────────────────────────────────

POST  /api/v1/inspector/visits/{id}/report
  Body: multipart/form-data (photos) + JSON report data
  {
    "crop_found": true,
    "crop_type_found": "Rice",
    "crop_type_matches": true,
    "crop_stage": "Maturity",
    "crop_condition": "moderate_damage",
    "actual_loss_pct": 45.0,
    "land_found": true,
    "land_area_observed": 2.4,
    "weather_at_visit": "post_rain",
    "visible_water_damage": true,
    "visible_fire_damage": false,
    "visible_pest_damage": false,
    "visible_hail_damage": false,
    "inspector_recommendation": "partial_approve",
    "recommended_payout_pct": 45.0,
    "notes": "Paddy crop observed with visible water stagnation marks...",
    "fraud_suspicion": false,
    "cce_conducted": false,
    "gps_end_lat": 13.3254,
    "gps_end_lng": 77.5129
  }

  On receipt:
  1. Validate all mandatory fields
  2. Validate GPS: compute distance from registered farm centroid
  3. Pull live NDVI for farm coordinates (GEE call)
  4. Auto-compute satellite cross-check:
     - If NDVI > 0.5 but actual_loss_pct > 60 → satellite_flag = true
     - If ndvi drops match inspector's finding → ndvi_matches = true
  5. Compute discrepancy_pct = |actual_loss_pct - claimed_loss_pct|
  6. Save report + photos to DB
  7. Update claim status → "Inspector Report Received"
  8. Re-run C++ fraud engine with new inspection data
     → Updated fraud score now includes inspector_discrepancy factor
  9. Notify admin: "Inspection report submitted for Claim BHV-XXXX"
  10. Notify farmer: "Field inspection completed. Decision within 7 days."
  11. Return: { report_id, updated_fraud_score, satellite_match }

POST  /api/v1/inspector/visits/{id}/photos
  → Upload geo-tagged photos (up to 15, each max 10MB)
  → Server validates: photo EXIF GPS must be within 1km of farm
  → If GPS missing from EXIF: inspector must manually confirm location
  → Photos stored in MinIO, URLs saved in report.photos JSONB

POST  /api/v1/inspector/visits/{id}/cce-plots
  Body: {
    plot_number, gps_lat, gps_lng, plot_size_sqm,
    crop_cut_weight_kg, moisture_pct, photo (multipart)
  }
  → Add individual CCE plot measurement
  → System auto-calculates: yield_per_ha, moisture-adjusted weight
  → Can add up to 5 plots per visit

─────────────────────────────────────────────────────────────
4.4 Inspector Dashboard Stats
─────────────────────────────────────────────────────────────

GET   /api/v1/inspector/dashboard
  Returns:
  {
    "stats": {
      "total_assigned": 12,
      "pending_acknowledgement": 2,
      "in_progress": 3,
      "submitted_this_month": 6,
      "overdue": 1,
      "completion_rate_pct": 85.0
    },
    "upcoming_visits": [...],  // next 5 by due_date
    "overdue_visits": [...],   // all overdue
    "recent_submitted": [...], // last 3 completed
    "map_assignments": [...]   // GeoJSON for map display
  }

GET   /api/v1/inspector/visits/history
  → All completed visits by this inspector
  → Shows outcome, fraud score change, whether recommendation matched admin decision

─────────────────────────────────────────────────────────────
4.5 Admin — Inspector Management Endpoints
─────────────────────────────────────────────────────────────

POST  /api/v1/admin/inspectors
  → Create new inspector account
  Body: { full_name, mobile, employee_id, department, badge_number,
          state, districts_assigned[] }

GET   /api/v1/admin/inspectors
  → List all inspectors with stats

GET   /api/v1/admin/inspectors/{id}
  → Inspector detail + all assigned/completed visits

PUT   /api/v1/admin/inspectors/{id}
  → Update districts, activate/deactivate

POST  /api/v1/admin/claims/{id}/assign-inspector
  Body: { inspector_id, visit_type, due_date_override? }
  → Assign inspector to a claim
  → Validates: inspector is in correct district
  → Creates field_visits record
  → Notifies inspector immediately

GET   /api/v1/admin/visits
  → All visits across all inspectors
  → Filters: status, inspector, district, overdue, date

GET   /api/v1/admin/visits/{id}
  → Full visit + report detail

PUT   /api/v1/admin/visits/{id}/verify-report
  Body: { verified: true/false, admin_notes }
  → Admin reviews submitted inspection report
  → Marks as verified or returns to inspector for correction
  → If verified: updates claim status and re-runs final fraud score

GET   /api/v1/admin/inspectors/performance
  → Leaderboard: completion rate, accuracy, avg turnaround days
  → Flag inspectors whose recommendations consistently disagree
    with satellite data (potential bribe risk)

═══════════════════════════════════════════════════════════════
PART 5: INSPECTOR PORTAL FRONTEND
═══════════════════════════════════════════════════════════════

─────────────────────────────────────────────────────────────
5.1 Routes
─────────────────────────────────────────────────────────────

/inspector/login              → Inspector login (shared auth)
/inspector/dashboard          → Main dashboard
/inspector/visits             → All assigned visits list
/inspector/visits/:id         → Visit detail + pre-visit info
/inspector/visits/:id/report  → Submit inspection report (multi-step)
/inspector/history            → Completed visits history
/inspector/profile            → Own profile

─────────────────────────────────────────────────────────────
5.2 Inspector Login Page
─────────────────────────────────────────────────────────────

Design: Same government-style white design as farmer login.
Logo: Bhuvigyan leaf icon.
Subtitle: "Field Inspector Portal — PMFBY Verification System"
Fields: Mobile (+91) + Password
On login: role check — if not field_inspector → show error
On success: → /inspector/dashboard

─────────────────────────────────────────────────────────────
5.3 Inspector Dashboard Page
─────────────────────────────────────────────────────────────

Layout: Government white bg, green primary, sidebar navigation.

SIDEBAR ITEMS:
  🏠 Dashboard
  📋 My Visits
  ✅ Submit Report (shortcut to in-progress visit)
  📅 History
  👤 Profile

TOP ROW — 5 KPI cards:
  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
  │  Assigned   │ Acknowledged│ In Progress │  Submitted  │   Overdue   │
  │     12      │      2      │      3      │      6      │    ⚠️ 1     │
  │   total     │  scheduled  │  ongoing    │  this month │  red badge  │
  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

MAIN CONTENT — 2 columns:

Left Column (60%):

  OVERDUE VISITS (red header, shown if any exist):
  ┌─────────────────────────────────────────────────────────────────┐
  │ ⚠️  OVERDUE                                                     │
  │ Claim BHV-2026-KA-000032 | Rajesh Kumar | Tumkur              │
  │ Due: 3 May 2026 (7 days overdue)                               │
  │ Crop: Cotton | Fraud Score: 74 | Trigger: NDVI Mismatch        │
  │ [Acknowledge] [View Details] [Report Problem]                  │
  └─────────────────────────────────────────────────────────────────┘

  UPCOMING VISITS (sorted by due date):
  Each visit card:
  ┌─────────────────────────────────────────────────────────────────┐
  │ 📍 Hosahalli, Doddaballapura, Bengaluru Rural                  │
  │ Farmer: Suresh Nayak  |  Claim: BHV-2026-KA-000028            │
  │ Crop: Paddy  |  Loss Claimed: 70%  |  NDVI: 0.52 (Fair)       │
  │ Fraud Score: 67  |  Due: 12 May 2026  |  ● NDVI Mismatch      │
  │ [View Details →]        [Acknowledge & Schedule]               │
  └─────────────────────────────────────────────────────────────────┘

Right Column (40%):

  MAP WIDGET:
  - Leaflet map showing all assigned farm locations as pins
  - Green pin = acknowledged, Orange = not yet acknowledged, Red = overdue
  - Click pin → visit card popup with "Navigate" button (opens Google Maps)

  RECENT SUBMISSIONS (last 3):
  - Claim no. | Farmer | Submitted | Admin Decision (Verified/Pending)

─────────────────────────────────────────────────────────────
5.4 Visit List Page (/inspector/visits)
─────────────────────────────────────────────────────────────

Filter bar: Status (All/Assigned/Acknowledged/In Progress/Submitted/Overdue)
            Date Range | Search by farmer name / claim number

Table columns:
  Claim No. | Farmer | Village | Crop | Loss Type | Fraud Score |
  Trigger | Due Date | Status | Actions

Status badges:
  ASSIGNED          — gray
  ACKNOWLEDGED      — blue (scheduled date shown)
  IN PROGRESS       — yellow (start time shown)
  SUBMITTED         — green
  OVERDUE           — red pulse badge

Trigger reason tags (small pills):
  🤖 Fraud Score 61–80
  🛰️ NDVI Mismatch
  📍 Geo-Cluster
  💰 High Amount
  🔁 Repeat Claimant
  👤 Manual (Admin)

Actions column:
  If ASSIGNED: [View] [Acknowledge]
  If ACKNOWLEDGED: [View] [Start Visit]
  If IN_PROGRESS: [Submit Report]
  If SUBMITTED: [View Report]

─────────────────────────────────────────────────────────────
5.5 Visit Detail Page (/inspector/visits/:id)
─────────────────────────────────────────────────────────────

This is the PRE-VISIT BRIEFING page. Inspector reads this before going.

LAYOUT — 3 sections:

SECTION A: CLAIM & FARMER SUMMARY
  ┌──────────────────────────────────────────────────────────────┐
  │ FARMER DETAILS                                               │
  │ Name: Suresh Nayak          Mobile: 9900000001 (tap to call)│
  │ Village: Hosahalli, Doddaballapura, Bengaluru Rural         │
  │ Survey No: 124/2-A          Land Area: 2.5 Ha               │
  │ KGIS: VERIFIED ✅           Aadhaar Seeded: YES ✅          │
  │                                                              │
  │ CLAIM DETAILS                                                │
  │ Claim No: BHV-2026-KA-000028                                │
  │ Crop: Paddy                 Season: Kharif 2025-26          │
  │ Loss Type: Flood            Loss Claimed: 70%               │
  │ Claim Amount: ₹1,75,000     Filed: 2 May 2026               │
  │                                                              │
  │ WHY THIS VISIT WAS ASSIGNED:                                 │
  │ "Fraud score 67 — NDVI reads 0.52 (Fair) but farmer claims  │
  │ 70% loss. SAR shows minor flooding but not extent claimed."  │
  └──────────────────────────────────────────────────────────────┘

SECTION B: SATELLITE INTELLIGENCE (live, loaded on page)
  ┌──────────────────────────────────────────────────────────────┐
  │ 🛰️  BHUMI AI SATELLITE REPORT — Live Data                   │
  │ Last Sentinel-2 Scan: 7 May 2026  |  Cloud Cover: 8%        │
  │                                                              │
  │ NDVI Value: 0.52  →  FAIR                                   │
  │ [████████████░░░░░░░░░░░░░░░] ●                             │
  │                                                              │
  │ 📡 SAR Flood:     Minor flooding detected (420 sqm)         │
  │ 🔥 Fire Alert:    No hotspots detected                      │
  │ 🌦 IMD Weather:   26mm rainfall last 14 days (Normal)       │
  │                                                              │
  │ NDVI 12-Month Chart: [line chart showing crop health trend] │
  │                                                              │
  │ ⚠️  SYSTEM NOTE: NDVI indicates Fair crop health.           │
  │    Farmer claims 70% loss. Investigate discrepancy.          │
  └──────────────────────────────────────────────────────────────┘

SECTION C: FARM LOCATION MAP
  - Leaflet map with registered farm centroid (green marker)
  - Satellite tile layer (hybrid: map + satellite imagery)
  - "Open in Google Maps" button → deep link with exact coordinates
  - "Copy Coordinates" button → lat,lng to clipboard

ACTION BUTTONS (bottom, full width):
  [Schedule Visit Date]  →  opens date picker modal
  [Start Visit Now]      →  only shown if scheduled_date = today
                             triggers GPS capture + status change

─────────────────────────────────────────────────────────────
5.6 Submit Report Page (/inspector/visits/:id/report)
─────────────────────────────────────────────────────────────

This is the MOST CRITICAL page. It is a 5-step guided form,
designed for field use: large touch targets, simple UI, works on 3G.

Design must be:
  - Mobile-first (tested at 375px width)
  - Large input elements (min 48px tap targets)
  - No table layouts (use card stacks)
  - Auto-save every 30 seconds to localStorage (prevent loss on refresh)
  - "Continue Later" button saves draft and returns to visit list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1: GPS & ARRIVAL CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  - Large "Capture My Location" button
  - Uses navigator.geolocation with high accuracy
  - Shows: current lat/lng, accuracy radius (must be < 50m)
  - Shows distance from registered farm centroid:
    ● Within 200m → "✅ GPS Verified — You are at the farm"
    ● 200m–1km   → "⚠️  You are Xm away from registered location"
    ● > 1km      → "❌ You are Xkm away. Are you at the right farm?"
  - Arrival time auto-recorded
  - Must capture GPS before proceeding to Step 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2: CROP OBSERVATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Fields (all required):

  Was the claimed crop found at this location?
    ● Yes  ○ No  ○ Different crop growing

  If "No" or "Different crop":
    → Show alert: "This is a major discrepancy. The farmer claimed
      [crop] but this is not what you found. Please document carefully."

  Crop Type Observed: [text input — pre-filled with claimed crop]

  Does this match the claimed crop? [Yes/No auto-calculated]

  Crop Growth Stage:
    ○ Land Preparation  ○ Seedling  ○ Vegetative
    ○ Flowering  ○ Grain Fill  ○ Maturity  ○ Harvested

  Overall Crop Condition:
    ○ Healthy (0–10% damage)
    ○ Mild Damage (11–25%)
    ○ Moderate Damage (26–50%)
    ○ Severe Damage (51–75%)
    ○ Total Loss (76–100%)

  Your Estimated Loss %: [slider 0–100, shows large number]

  Farmer's Claimed Loss % (read-only for comparison): 70%

  Discrepancy: [auto-calculated, shown in red if > 20%]
  Example: "⚠️ Your estimate (45%) differs from claimed (70%) by 25%"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3: LAND & DAMAGE VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Was agricultural land present at this location?
    ● Yes  ○ No (if No: major red flag, cannot proceed normally)

  Observed Land Area (Ha): [decimal input]
  Registered Land Area: 2.5 Ha (read-only reference)

  Types of Damage Observed: [multi-select checkboxes]
    ☐ Water Damage / Flooding    ☐ Hail Damage
    ☐ Fire / Burn Marks          ☐ Pest Infestation
    ☐ Disease / Fungal Damage    ☐ Drought / Wilting
    ☐ No visible damage          ☐ Other

  Current Weather Conditions:
    ○ Clear / Sunny   ○ Cloudy   ○ Post-Rain   ○ Raining Now

  CCE (Crop Cutting Experiment) Required?
    ● Not Required (damage visible, no CCE needed)
    ○ Yes, conducting CCE
      → If yes: show CCE sub-section:
        Plot 1: [size sqm] [crop weight kg] [moisture %] [photo upload]
        Plot 2: [+ Add Plot button]
        (up to 5 plots)
        System auto-calculates: yield/ha, loss% from CCE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4: PHOTO & VIDEO EVIDENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Required photos (minimum 5):

  Mandatory:
    📷 Overall farm view (minimum 1)
    📷 Crop damage close-up (minimum 2)
    📷 Land boundary / survey marker (minimum 1)
    📷 Inspector with farm in background (selfie-style, minimum 1)

  Optional but recommended:
    📷 IMD/Patwari certificate (if available)
    📷 Farmer's insurance document
    🎬 Short video (max 60 seconds, 50MB)

  Each photo:
    - Opens camera directly (mobile: rear camera preferred)
    - GPS tag embedded automatically
    - Timestamp embedded automatically
    - Server validates GPS is within 1km of farm
    - Thumbnail preview shown after capture
    - Remove button

  Photo count indicator: "5/5 required ✅  2 optional"

  IMPORTANT: Inspector is warned:
  "Photos must be taken at the farm. GPS coordinates will be
  verified. Do not upload photos taken elsewhere."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5: RECOMMENDATION & SUBMIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Your Recommendation:
    ○ Approve Full Claim   — damage matches claim
    ○ Partial Approval     — damage confirmed but amount overstated
    ○ Reject Claim         — no damage found / major discrepancy
    ○ Further Investigation— inconclusive, need lab/specialist

  If "Partial Approval":
    → Recommended Payout %: [slider]
    → Shows: ₹ amount = sum_insured × recommended_pct

  Do you suspect fraud?
    ○ No — findings seem genuine
    ● Yes → Fraud Suspicion Reason: [text area required]
      Examples: "Crop was different from claimed"
                "Farm appeared recently cut/harvested, not damaged"
                "Farmer was uncooperative and delayed access"
                "GPS of farm does not match actual plot"

  Additional Notes: [text area — describe what you observed]
  (Minimum 50 characters)

  SUMMARY before submit:
  ┌──────────────────────────────────────────────────────────────┐
  │ INSPECTION SUMMARY                                           │
  │ Claim: BHV-2026-KA-000028  |  Farmer: Suresh Nayak         │
  │ GPS: ✅ Verified (45m from farm centroid)                   │
  │ Crop Found: ✅ Paddy                                        │
  │ Crop Matches Claimed: ✅                                    │
  │ Inspector Loss Estimate: 45%                                │
  │ Farmer's Claimed Loss: 70%                                  │
  │ ⚠️  Discrepancy: 25% — Admin will review                   │
  │ Recommendation: PARTIAL APPROVE (45%)                       │
  │ Photos: 7 uploaded (GPS verified)                           │
  │ Fraud Suspicion: No                                         │
  │                                                             │
  │ Confirmation checkboxes:                                    │
  │ ☑ I visited this farm physically on [date]                  │
  │ ☑ All findings reported are true and accurate               │
  │ ☑ I understand that false reports are a criminal offense    │
  └──────────────────────────────────────────────────────────────┘

  [Submit Report] button → triggers API call, shows loading, then:

  SUCCESS SCREEN:
  ✅ Report Submitted Successfully
  Report ID: RPT-2026-0892
  Claim status: "Inspector Report Received"
  Satellite cross-check: NDVI matches your finding (0.52 = Fair ≈ 45% loss)
  Updated Fraud Score: 58 (was 67 — reduced due to your findings)
  Admin will review within 48 hours.
  [Back to Dashboard]

═══════════════════════════════════════════════════════════════
PART 6: ADMIN PANEL ADDITIONS FOR INSPECTOR MANAGEMENT
═══════════════════════════════════════════════════════════════

These tabs/sections are ADDED to the existing admin panel from V7 SRS.

─────────────────────────────────────────────────────────────
NEW ADMIN TAB: Inspector Management (Tab 13)
─────────────────────────────────────────────────────────────

What it is:
  Complete management of all field inspectors in the system.

Why it exists:
  Admin must assign visits, track inspector performance,
  and detect if inspectors themselves are colluding with farmers
  (the VAO bribe loophole — now the inspector is the risk).

UI Layout:

Top: 4 KPI cards
  Total Inspectors | Active Visits | Overdue Visits | Avg Completion Rate

Inspector Table:
  Name | Employee ID | Districts | Active | Assigned | Completed | Rate | Last Active | Actions

Row expand → Inspector detail:
  - All current visits (with status)
  - Performance chart (monthly completions)
  - ANTI-CORRUPTION SCORE:
    • "Inspector vs Satellite Agreement Rate" — % of times
      inspector's loss estimate matched satellite NDVI
    • If this score is consistently low: admin flagged
    • Display: "Agreement: 85% ✅" or "Agreement: 40% ⚠️ Review"

Functions:
  1. Create Inspector — form with all fields, districts assigned
  2. Edit Inspector — update districts, deactivate
  3. Assign to Claim — select inspector from dropdown
     (only shows inspectors in correct district)
  4. View All Visits — filter by this inspector
  5. Performance Report — PDF report of inspector's stats
  6. Flag Inspector — mark for internal review
     (if agreement rate < 60% for > 5 visits)

─────────────────────────────────────────────────────────────
UPDATED ADMIN TAB: Claims Management (enhanced)
─────────────────────────────────────────────────────────────

Add to existing Claims tab:

  When claim status = "Field Visit Required":
    → Show "Assign Inspector" button
    → Modal: list of inspectors in correct district
      Sorted by: fewest active visits (workload balance)
      Shows each inspector's current active visit count + rate
    → Select + confirm → visit assigned, inspector notified

  When claim status = "Inspector Report Received":
    → Show "Review Inspection Report" button
    → Opens inspection report panel:
      ┌────────────────────────────────────────────────────────┐
      │ INSPECTION REPORT — BHV-2026-KA-000028                │
      │ Inspector: Rajesh Sharma (EMP-4521)                   │
      │ Visit Date: 10 May 2026  |  Duration: 2h 15m          │
      │ GPS: ✅ Verified (45m from farm)                       │
      │                                                        │
      │ Crop Found: ✅ Paddy                                   │
      │ Crop Condition: Moderate Damage                        │
      │ Inspector Loss %: 45%                                  │
      │ Farmer Claimed %: 70%                                  │
      │ ⚠️  Discrepancy: 25%                                  │
      │                                                        │
      │ Satellite Cross-check:                                │
      │   NDVI: 0.52 (Fair) → Approx 25–40% expected loss    │
      │   Inspector estimate: 45% → NDVI AGREES ✅            │
      │                                                        │
      │ Recommendation: PARTIAL APPROVE (45%)                 │
      │ Fraud Suspicion: No                                    │
      │ Notes: "Water stagnation marks visible..."            │
      │                                                        │
      │ Photos: [gallery of 7 GPS-verified photos]            │
      │                                                        │
      │ Final Fraud Score: 58 (was 67 before inspection)      │
      │                                                        │
      │ [✅ Approve ₹78,750]  [⚠️ Partial]  [❌ Reject]      │
      └────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────
ANTI-CORRUPTION SAFEGUARDS (V7 key differentiator)
─────────────────────────────────────────────────────────────

The system automatically detects inspector corruption signals:

1. GPS Mismatch Alert
   If inspector submits report from > 1km away from farm:
   → Admin gets: "⚠️  Inspector Rajesh submitted report from
     1.8km away from farm centroid. Possible desk filing."

2. Speed Completion Alert
   If inspection completed in < 20 minutes:
   → Admin gets: "⚠️  Visit for 2.5Ha farm completed in 12 minutes.
     Minimum expected: 45 minutes."

3. Satellite vs Inspector Disagreement
   If NDVI = 0.72 (Good) but inspector reports 80% loss:
   → Auto-flag: "Inspector finding contradicts satellite data by 70%.
     Requires secondary review."

4. Pattern Detection
   If same inspector consistently recommends full approval on
   high-fraud-score claims → weekly report to admin

5. Photo GPS Validation
   Every photo GPS coordinate must be within 1km of farm.
   If not → photo rejected, inspector warned, admin notified.

6. Duplicate Report Detection
   If inspector submits same GPS + same claim details twice
   within 24h → blocked, admin alerted.

═══════════════════════════════════════════════════════════════
PART 7: COMPLETE FRAUD PIPELINE WITH INSPECTOR
═══════════════════════════════════════════════════════════════

Full end-to-end flow showing where inspector fits:

  FARMER submits claim
       ↓
  C++ Fraud Engine runs (Version 1 — without inspection)
  Satellite NDVI + SAR + Weather pulled from GEE
       ↓
  Score 0–30: → Auto-Approve Queue (Admin reviews quickly)
  Score 31–60: → Manual Review Queue (Admin reviews docs + satellite)
  Score 61–80: → ★ FIELD VISIT TRIGGERED ★
  Score 81–100: → Auto-Reject Queue (Admin reviews for final rejection)
       ↓
  For 61–80 claims:
    Admin assigns Field Inspector from the correct district
    Inspector acknowledges → schedules → visits → submits report
       ↓
  C++ Fraud Engine runs AGAIN (Version 2 — with inspection data)
  New inputs added:
    + inspector_loss_pct (from report)
    + gps_verified (true/false)
    + crop_found (true/false)
    + land_found (true/false)
    + inspector_recommendation
    + satellite_inspector_agreement (auto-computed)
    + photo_count_gps_verified
       ↓
  Updated score computed. Now three outcomes possible:
    Score drops to 0–60: → Moves to Approve/Review Queue
    Score stays 61–80:   → Admin makes manual call using all evidence
    Score rises to 81+:  → Strengthened rejection case

  Admin makes FINAL decision using:
    ✓ Inspector report + photos
    ✓ Satellite data (live NDVI)
    ✓ C++ fraud score (v2)
    ✓ Uploaded farmer documents
    ✓ Historical claim data

═══════════════════════════════════════════════════════════════
PART 8: C++ ENGINE UPDATE — NEW INSPECTOR FACTORS
═══════════════════════════════════════════════════════════════

Add these new scoring factors to the C++ fraud engine
when inspection data is available:

Input JSON additions:
  "inspector_report_available": true,
  "inspector_loss_pct": 45.0,
  "claimed_loss_pct": 70.0,
  "gps_verified": true,
  "crop_found": true,
  "crop_matches": true,
  "land_found": true,
  "inspector_recommendation": "partial_approve",
  "fraud_suspicion_by_inspector": false,
  "satellite_inspector_agreement": true,
  "visit_duration_minutes": 135,
  "photo_count": 7,
  "gps_photo_verified": true

New scoring rules (add to scorer.cpp):

  if (inspector_report_available):

    // Discrepancy factor
    discrepancy = abs(claimed_loss_pct - inspector_loss_pct)
    if discrepancy > 30: score += 20
    elif discrepancy > 20: score += 12
    elif discrepancy > 10: score += 5
    else: score -= 10  // Inspector confirms claim → reduce score

    // Crop not found
    if (!crop_found): score += 35  // massive red flag

    // Land not found
    if (!land_found): score += 40  // critical fraud indicator

    // GPS not verified
    if (!gps_verified): score += 8

    // Satellite and inspector agree → reduce score
    if (satellite_inspector_agreement): score -= 15

    // Inspector fraud suspicion
    if (fraud_suspicion_by_inspector): score += 25

    // Visit too fast
    if (visit_duration_minutes < 20): score += 10

    // All photos GPS-verified
    if (gps_photo_verified && photo_count >= 5): score -= 5

Output additions:
  "inspector_discrepancy_score": 20.0,
  "inspection_version": "v2_with_inspector",
  "inspector_agreement": true

═══════════════════════════════════════════════════════════════
PART 9: NOTIFICATIONS FOR INSPECTOR FLOW
═══════════════════════════════════════════════════════════════

| Trigger | Recipient | Channel | Message |
|---------|-----------|---------|---------|
| Visit assigned | Inspector | SMS + App | "New visit assigned: Suresh Nayak, Hosahalli. Due: 12 May. View in Bhuvigyan Inspector App." |
| Visit assigned | Farmer | SMS | "A field inspector will visit your farm within 3–7 working days." |
| Inspector acknowledges + schedules | Farmer | SMS | "Inspector will visit on 12 May. Please be available." |
| Inspector starts visit | Admin | App | "Inspector Rajesh has started visit for Claim BHV-000028." |
| Report submitted | Admin | App + Email | "Inspection report received. Review required." |
| Report submitted | Farmer | SMS | "Field inspection complete. Decision expected within 7 days." |
| Visit overdue | Admin | App | "⚠️  Visit for Claim BHV-000028 is 2 days overdue. Inspector: Rajesh." |
| Inspector flag | Admin | App | "Inspector Rajesh Sharma flagged: GPS mismatch in 3 recent reports." |
| Report verified | Inspector | App | "Report verified by Admin. Claim approved at 45%." |

═══════════════════════════════════════════════════════════════
PART 10: BUILD ORDER (Inspector additions)
═══════════════════════════════════════════════════════════════

Add these steps to the V7 SRS build order (after Step 9):

  9a. Add field_inspectors table + migration
  9b. Add field_visits table + migration
  9c. Add field_inspection_reports table + migration
  9d. Add cce_plots table + migration
  9e. Build inspector auth (role: field_inspector, login only)
  9f. Build all inspector API endpoints
  9g. Build admin inspector management endpoints
  9h. Update C++ fraud engine with inspector factors (v2)
  9i. Build Inspector Portal frontend:
      - Login page
      - Dashboard (5 KPI cards + visit list + map)
      - Visit detail (pre-briefing + satellite + map)
      - Submit Report (5-step mobile-first form)
      - History page
  9j. Add Inspector tab to Admin panel
  9k. Update Claims tab with assign-inspector + report-review panel
  9l. Add all inspector notification triggers
  9m. Add anti-corruption detection jobs
  9n. E2E test: Admin assigns inspector → Inspector visits →
      Submits report → C++ rescores → Admin reviews → Pays

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF BHUVIGYAN V7 — FIELD INSPECTOR PORTAL PROMPT
This slot into V7 SRS as Role 3.
3 Roles total: farmer | field_inspector | admin
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

***

*Document Version: 7.0 | Bhuvigyan — V1*
*Bhuvijyan Development Team | May 2026*
*"Securing India's Agrarian Future through Technology and AI-Driven Insurance Solutions."*