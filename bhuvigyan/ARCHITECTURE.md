# Bhuvigyan — Karnataka Land Intelligence Platform
## Production Architecture & Build Plan

---

## 1. System Understanding

**Bhuvigyan** is a farmer-facing land verification and agricultural intelligence platform for Karnataka, India. It unifies three historically separate systems into one coherent workflow:

- **Bhoomi** — Karnataka land records (RTC, ownership, area, classification)
- **KGIS** — Karnataka GIS web services (parcel polygons, admin boundaries)
- **GEE / Sentinel-2** — Satellite imagery and NDVI/NDWI analysis

### Why this exists
Farmers and agricultural officers currently navigate multiple disconnected portals to verify land, check crop health, and process insurance claims. Bhuvigyan collapses this into a single backend-orchestrated workflow where the frontend only speaks to one API.

### Core value proposition
1. **Select land** through real Karnataka admin hierarchy (District → Taluk → Hobli → Village → Survey)
2. **Verify ownership & area** against Bhoomi RTC records
3. **Visualize the parcel** from KGIS polygon geometry
4. **Assess crop health** via Sentinel-2 NDVI clipped to the exact parcel boundary
5. **Detect fraud anomalies** via vegetation, temporal, area-mismatch, and flood signals

---

## 2. Final Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FARMER / OFFICER UI                             │
│  React 18 + TypeScript + TailwindCSS + Zustand + Leaflet + Recharts         │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Admin Selector│  │  Land Info   │  │   Map View   │  │  Analysis    │       │
│  │ (5 dropdowns)│  │ (Bhoomi RTC) │  │(Polygon/NDVI)│  │NDVI+Fraud  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTP/JSON
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BHUVIGYAN FASTAPI BACKEND                            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  UNIFIED ANALYSIS ENDPOINT  (POST /api/v1/analysis)                 │   │
│  │  - Orchestrates all downstream services in parallel where possible  │   │
│  │  - Returns ONE JSON: land_record + polygon + ndvi + fraud           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │          │              │              │              │            │
│         ▼          ▼              ▼              ▼              ▼            │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐      │
│  │ Bhoomi  │  │  KGIS   │  │ Polygon  │  │   GEE   │  │   Fraud      │      │
│  │ Service │  │ Service │  │ Processor│  │  NDVI   │  │   Engine     │      │
│  │         │  │         │  │          │  │ Service │  │              │      │
│  │ District│  │Admin H  │  │WKT→GeoJSON│  │Sentinel2│  │Area mismatch │      │
│  │ Taluk   │  │Survey#  │  │Centroid  │  │clip by  │  │NDVI anomaly  │      │
│  │ Hobli   │  │Polygon  │  │Area calc │  │polygon  │  │Temporal drift│      │
│  │ Village │  │Nearby   │  │Validation│  │Timeseries│  │Flood signal │      │
│  │ RTC     │  │         │  │          │  │         │  │              │      │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘      │
│         │          │              │              │              │            │
│         ▼          ▼              ▼              ▼              ▼            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     REDIS CACHE LAYER                               │   │
│  │  - Admin hierarchies: 7 days                                        │   │
│  │  - Survey polygons: 1 day                                           │   │
│  │  - NDVI results: 6 hours                                            │   │
│  │  - Fraud scores: 1 hour                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     POSTGRESQL DATABASE                              │   │
│  │  - Farmer profiles, UDLRN records, claims, audit logs             │   │
│  │  - Location tables (state→district→taluk→hobli→village)           │   │
│  │  - Satellite reports, fraud scores, notifications                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. End-to-End Data Flow

### Phase A: Administrative Selection (Frontend)
```
User opens app
  → Frontend calls GET /api/v1/land/districts
  → Dropdown populated with Karnataka districts

User selects District (e.g., "Bengaluru Rural")
  → Frontend calls GET /api/v1/land/taluks?districtCode=<code>
  → Taluk dropdown enabled & populated
  → Hobli, Village, Survey dropdowns reset

User selects Taluk
  → Frontend calls GET /api/v1/land/hoblis?talukCode=<code>
  → Hobli dropdown enabled & populated
  → Village, Survey dropdowns reset

User selects Hobli
  → Frontend calls GET /api/v1/land/villages?hobli_code=<code>
  → Village dropdown enabled & populated
  → Survey dropdown reset

User selects Village
  → Frontend has village metadata (name, code, kgis_village_id)
  → Optionally calls GET /api/v1/land/survey-numbers to preload survey list
  → Survey Number input/dropdown enabled

User enters/selects Survey Number
  → "Analyze" button becomes active
```

### Phase B: Unified Analysis (Backend Orchestration)
```
User clicks "Analyze Land"
  → Frontend calls POST /api/v1/analysis
       {
         "district": "Bengaluru Rural",
         "taluk": "Devanahalli",
         "hobli": "Doddaballapura",
         "village": "Kannamangala",
         "survey_number": "45",
         "hissa_number": "1",
         "kgis_village_id": "5722"
       }

Backend executes:
  1. fetch_rtc(district, taluk, hobli, village, survey_number, hissa)
     → Bhoomi / Surepass / mock fallback
  2. get_survey_polygon(kgis_village_id, survey_number)
     → KGIS geomForSurveyNum
  3. get_admin_hierarchy(village_code)
     → KGIS kgisadminhierarchy
  4. compute_polygon_ndvi(polygon_geojson, months=12)
     → GEE Sentinel-2 clipped to polygon
  5. compute_fraud_score(rtc_area, polygon_area, ndvi_mean, ndwi, crop_declared)
     → Python fraud engine

All services run with:
  - Redis caching (read-through)
  - Circuit-breaker fallback (mock data if external API fails)
  - Structured logging
  - 15-30s timeout per external call

Backend returns ONE unified JSON:
  {
    "success": true,
    "data": {
      "land_record": { "owner_name", "area_hectares", "survey_number", ... },
      "polygon": { "geojson", "centroid", "area_ha_computed", "found" },
      "admin": { "district", "taluk", "hobli", "village", "village_code" },
      "ndvi": { "mean", "health_label", "timeseries", "scan_date" },
      "fraud": { "score", "band", "factors", "recommendation" }
    }
  }
```

### Phase C: Frontend Rendering
```
Frontend receives unified response
  → Land Info Panel: owner name, area, classification
  → Map Component: fit bounds to GeoJSON polygon, show centroid marker
  → NDVI Dashboard: current value, health label, 12-month chart
  → Fraud Card: score bar, risk factors, recommendation badge
```

---

## 4. Frontend Workflow & UI Layout

### A. Administrative Selection UI

**Component:** `AdminSelector` — a vertical stack of 5 dropdowns.

| Dropdown | Trigger | API | State |
|---|---|---|---|
| **State** | On mount | `GET /api/v1/land/districts?state=karnataka` | Karnataka only (disabled) |
| **District** | On mount / after state | `GET /api/v1/land/districts` | Enabled, shows spinner while loading |
| **Taluk** | District selected | `GET /api/v1/land/taluks?districtCode=<id>` | Disabled until district picked. Cleared when district changes. |
| **Hobli** | Taluk selected | `GET /api/v1/land/hoblis?talukCode=<id>` | Disabled until taluk picked. Cleared when taluk changes. |
| **Village** | Hobli selected | `GET /api/v1/land/villages?hobli_code=<id>` | Disabled until hobli picked. Cleared when hobli changes. |
| **Survey Number** | Village selected | Optional: `GET /api/v1/land/survey-numbers` | Free text or dropdown. Enabled when village resolved. |

**UX Rules:**
- Each dropdown shows `Loading...` while fetching
- If an API fails, show inline error with retry button
- Changing a parent dropdown clears all children
- Survey Number can be typed manually if KGIS list is unavailable
- A "Reset All" button clears everything
- Analyze button disabled until all required fields have values

### B. Land Information Panel

Displayed as a white card with labeled rows:

- **Owner Name** (from Bhoomi RTC)
- **Survey Number / Hissa Number**
- **Village, Hobli, Taluk, District**
- **Recorded Area** (hectares + acres)
- **Land Classification** (Agricultural / Dry / Wet)
- **RTC Period** (Current Year)
- **Mutation Status** (if available)

If Bhoomi is unavailable, show yellow warning banner: "Bhoomi record unavailable — showing KGIS metadata only."

### C. Map Section

- **Base tiles:** OpenStreetMap default
- **Parcel overlay:** GeoJSON polygon from KGIS, styled with green fill (10% opacity) and dark green border
- **Centroid marker:** Blue pin with popup showing survey number + area
- **Auto-fit:** Map bounds automatically fit to polygon on load
- **Layer toggle:** Satellite imagery | NDVI false-color | RGB true-color
- **Warning badge:** If polygon is self-intersecting or has < 3 points, show orange "Geometry Issue" warning

### D. Analysis Dashboard

Three cards stacked vertically:

1. **NDVI Summary Card**
   - Current NDVI value (large number)
   - Health label badge (color-coded: Critical → Excellent)
   - Scan date and cloud cover
   - Source: "Sentinel-2 SR Harmonized"

2. **NDVI Time-Series Chart**
   - Area chart with 12 months of data
   - X-axis: date labels
   - Y-axis: NDVI 0.0–1.0
   - Reference lines at 0.2 (poor) and 0.6 (healthy)
   - Anomaly points highlighted in red

3. **Fraud Score Card**
   - Circular score indicator (0–100)
   - Color band: Clean (green) / Low Risk (yellow) / Medium (orange) / High (red)
   - Progress bar showing score
   - Recommendation text (e.g., "No fraud detected. Proceed with claim.")
   - Expandable list of risk factors with severity badges

---

## 5. Backend Workflow

### API Layer Design

All public endpoints follow this envelope:
```json
{
  "success": true,
  "data": { ... },
  "cached": false,
  "source": "live"
}
```

Errors:
```json
{
  "success": false,
  "error": {
    "message": "Bhoomi service timeout",
    "code": "EXTERNAL_TIMEOUT",
    "source": "bhoomi"
  }
}
```

### Unified Endpoint: `POST /api/v1/analysis`

**Why one endpoint is better than fragmented requests:**
- **Performance:** Backend can parallelize Bhoomi + KGIS calls while frontend waits once
- **Consistency:** No race conditions between multiple frontend requests
- **Security:** External API keys (Bhoomi, GEE) never reach the browser
- **Caching:** One cache key per land parcel instead of 4–5 separate caches
- **Mobile-friendly:** Low-bandwidth clients download one JSON instead of many

**Request body:**
```json
{
  "district": "Bengaluru Rural",
  "taluk": "Devanahalli",
  "hobli": "Doddaballapura Hobli",
  "village": "Kannamangala",
  "survey_number": "45",
  "hissa_number": "1",
  "kgis_village_id": "5722",
  "declared_crop": "Paddy",
  "claimed_area_ha": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "land_record": { ... },
    "polygon": { ... },
    "admin": { ... },
    "ndvi": { ... },
    "fraud": { ... }
  }
}
```

### Service Responsibilities

| Service | Responsibility |
|---|---|
| `BhoomiService` | Fetch districts, taluks, hoblis, villages, RTC records. Normalize inconsistent Bhoomi response formats. Fallback to local CSV data. |
| `KGISService` | Fetch admin hierarchy, survey numbers, survey polygons (WKT), nearby admin. Parse WKT to GeoJSON. Retry across multiple base URLs. |
| `PolygonProcessor` | WKT → coordinate array → GeoJSON. Compute centroid, area (ha), validate geometry. Handle multipolygon. |
| `NDVIService` | GEE initialization, Sentinel-2 collection filtering, cloud masking, NDVI computation clipped to polygon, time-series generation. |
| `FraudService` | Score computation from NDVI, area mismatch, temporal anomaly, NDWI flood signal. Band classification. Recommendation generation. |
| `AnalysisService` | Orchestrator. Calls above services, aggregates results, handles partial failures, applies caching, returns unified envelope. |

---

## 6. Bhoomi Integration Layer

Bhoomi is the Karnataka land records system. It exposes SOAP-like JSON endpoints.

**Base URLs tried in order:**
1. `https://landrecords.karnataka.gov.in/service1.svc`
2. `https://landrecords.karnataka.gov.in/Service1.svc`
3. `https://landrecords.karnataka.gov.in/Service2/service1.svc`

**Endpoints consumed:**
- `getAllDistricts` → dropdown population
- `getAllTaluks?districtCode=` → dropdown population
- `getAllHoblis?talukCode=` → dropdown population
- `getAllVillages?hobliCode=` → dropdown population
- `getRTC` (via Surepass proxy if available) → owner name, area, land type

**Normalization:** Bhoomi returns inconsistent key casing (`DistrictName` vs `districtName`). The service normalizes everything to snake_case before returning to the API layer.

**Fallback:** If Bhoomi is down, the system falls back to:
1. Local PostgreSQL location tables (`locations.py` router)
2. Uploaded CSV files (`local_data_service.py`)

---

## 7. KGIS Integration Layer

KGIS (Karnataka GIS, KSRSAC) exposes REST endpoints for geospatial data.

**Base URLs tried in order:**
1. `https://kgis.ksrsac.in:9000/genericwebservices/ws`
2. `http://kgis.ksrsac.in:9000/genericwebservices/ws`

**Endpoints consumed:**
- `kgisadminhierarchy` → district, taluk, hobli, village metadata
- `surveyno` → list of survey numbers near a coordinate
- `geomForSurveyNum/{villageid}/{survey}/DD` → WKT polygon
- `nearbyadminhierarchy` → reverse geocoding

**WKT Parsing:**
KGIS returns `POLYGON((lng lat, lng lat, ...))`. The parser extracts coordinate pairs, flips them to `[lat, lng]` for Leaflet, and computes:
- Centroid (average of vertices)
- Area (shoelace formula with approximate meter conversion)
- Validation (≥ 3 points, no self-intersection check)

---

## 8. Geospatial Processing Flow

```
WKT from KGIS
  → Extract coordinate string with regex
  → Split into [lng, lat] pairs
  → Flip to [lat, lng] for Leaflet
  → Compute centroid (mean lat, mean lng)
  → Compute area via shoelace formula
  → Validate: at least 3 points?
  → Convert to GeoJSON Polygon feature
  → Return {geojson, leaflet_coords, centroid, area_ha, valid}
```

**Why polygon-based NDVI instead of point-based:**
- A point is just one pixel (10m × 10m = 100 sqm). A 2-hectare parcel covers ~200 pixels.
- Polygon-based analysis averages NDVI across the entire parcel, eliminating edge effects and single-pixel noise.
- It allows area computation for mismatch detection.
- It enables true crop-health zoning (if the parcel has mixed vegetation).

---

## 9. NDVI Pipeline

```
Polygon GeoJSON
  → Convert to GEE Geometry (ee.Geometry.Polygon)
  → Build Sentinel-2 SR Harmonized image collection
      filterBounds(polygon)
      filterDate(last_60_days)
      filter(cloud < 20%)
      sort(system:time_start DESC)
  → Take first (most recent) image
  → Compute NDVI = (B8 - B4) / (B8 + B4)
  → reduceRegion(mean) over polygon
  → Return {ndvi_mean, scan_date, cloud_cover, source}

For time-series:
  → Same collection, last 12 months
  → map over images, extract mean NDVI per image
  → Sort by date
  → Detect anomalies (values > 2 std dev from mean)
  → Return array of {date, ndvi, label, is_anomaly}
```

**Cloud masking:** Images with > 20% cloud cover are excluded. If no images remain, the service returns a clear error message and falls back to mock data for UI continuity.

---

## 10. Fraud Analysis Pipeline

**Fraud signals used:**

| Signal | Weight | Condition |
|---|---|---|
| Vegetation anomaly | +25 | NDVI < 0.15 (bare soil) but crop claimed |
| Low vegetation | +15 | NDVI < 0.30 |
| Temporal anomaly | +20 | Current NDVI > 2σ below 12-month mean |
| Uniform NDVI | +10 | Std dev < 0.05 (suspiciously flat) |
| Area mismatch | +20 | \|computed_area - claimed_area\| / claimed_area > 30% |
| Flood signal | +15 | NDWI > 0.3 (waterlogged) |

**Scoring bands:**
- 0–25: **CLEAN** — Auto-approve
- 26–50: **LOW_RISK** — Officer review optional
- 51–75: **MEDIUM_RISK** — Mandatory field visit
- 76–100: **HIGH_RISK** — Auto-reject / FIR recommended

**Recommendation text generated based on band and top factors.**

---

## 11. Caching Strategy

| Data | TTL | Key Pattern |
|---|---|---|
| Districts | 7 days | `bhoomi:districts:{state}` |
| Taluks | 7 days | `bhoomi:taluks:{district_code}` |
| Hoblis | 7 days | `bhoomi:hoblis:{taluk_code}` |
| Villages | 7 days | `bhoomi:villages:{hobli_code}` |
| Admin hierarchy | 1 day | `kgis:admin:{village_code}` |
| Survey polygon | 1 day | `kgis:polygon:{village_id}:{survey_number}` |
| NDVI current | 6 hours | `gee:ndvi:{lat}:{lng}:{date}` |
| NDVI timeseries | 6 hours | `gee:ndvi:ts:{lat}:{lng}:{months}` |
| Fraud score | 1 hour | `fraud:{claim_hash}` |
| Unified analysis | 6 hours | `analysis:{district}:{taluk}:{village}:{survey}` |

All cache reads are `try/except` wrapped so Redis failure does not break the request.

---

## 12. Security & Production Architecture

- **CORS:** Whitelist only `localhost:5173`, `localhost:3000`, and deployed domain
- **Rate limiting:** 5 login attempts per IP per minute (Redis-backed)
- **API key isolation:** Bhoomi, GEE, Surepass tokens live only in backend `.env`
- **No external API calls from browser:** Frontend only hits `/api/v1/*`
- **Input validation:** Pydantic models for all request bodies
- **Timeout & retry:** 15s timeout, 3 retries with exponential backoff for KGIS/Bhoomi
- **SSL verification disabled for KGIS:** KGIS uses self-signed certs on port 9000
- **Circuit breaker:** If external service fails 3 times in 60s, use fallback for 5 minutes
- **Structured logging:** Every external call logged with URL, latency, status, and error if any

---

## 13. Final Folder Structure

```
bhuvigyan/
├── ARCHITECTURE.md
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   ├── app/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── redis_client.py
│   │   ├── dependencies.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── land.py          (existing: dropdowns, RTC, KGIS)
│   │   │   ├── locations.py     (existing: DB-based hierarchy)
│   │   │   ├── satellite.py     (existing: NDVI endpoints)
│   │   │   ├── fraud_scoring.py (existing: fraud DB endpoints)
│   │   │   └── analysis.py      (NEW: unified orchestrator)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── land_service.py      (existing)
│   │   │   ├── satellite_service.py (existing)
│   │   │   ├── fraud_service.py     (existing)
│   │   │   ├── local_data_service.py (existing)
│   │   │   ├── gee_init.py          (existing)
│   │   │   └── analysis_service.py  (NEW: orchestrator)
│   │   ├── models/
│   │   │   ├── farmer.py
│   │   │   ├── udlrn_master.py
│   │   │   ├── location.py
│   │   │   └── ...
│   │   └── schemas/
│   │       └── analysis.py      (NEW: Pydantic request/response)
│   └── secrets/
│       └── gee_service_account.json
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/
│       │   ├── client.ts
│       │   ├── admin.ts         (NEW: dropdown APIs)
│       │   └── analysis.ts      (NEW: unified analysis API)
│       ├── store/
│       │   └── analysisStore.ts (NEW: Zustand store)
│       ├── components/
│       │   ├── AdminSelector.tsx   (NEW: cascading dropdowns)
│       │   ├── LandInfoPanel.tsx   (NEW: Bhoomi data card)
│       │   ├── SurveyMap.tsx       (existing, updated)
│       │   ├── NDVIChart.tsx       (existing, updated)
│       │   ├── FraudCard.tsx       (existing, updated)
│       │   ├── AnalysisDashboard.tsx (NEW: main layout)
│       │   └── ui/
│       │       ├── Spinner.tsx
│       │       ├── ErrorBox.tsx
│       │       └── Badge.tsx
│       └── pages/
│           └── HomePage.tsx      (NEW: replaces Dashboard)
│
```

---

## 14. Build & Run Commands

### Backend
```bash
cd bhuvigyan/backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Ensure Redis is running on localhost:6379
# Ensure PostgreSQL is running with bhuvigyan database
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd bhuvigyan/frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

*End of Architecture Document*
