# BHUVIGYAN V7 — COMPLETE REAL-DATA FULL SYSTEM TEST SPECIFICATION
## AI-Powered Crop Insurance Fraud Detection Platform — India

**Version:** 7.0.0  
**Date:** 2026-05-10  
**Scope:** Real satellite imagery, real weather APIs, real ML inference, real Kafka events, real database state, real fraud scoring engine  
**Environment:** Python/FastAPI backend, PostgreSQL, Redis, Kafka, React/TS frontend, GEE, C++ fraud engine

---

## TABLE OF CONTENTS

- [Part A: Real Satellite Data Tests](#part-a-real-satellite-data-tests)
- [Part B: Real Weather Data Tests](#part-b-real-weather-data-tests)
- [Part C: Real Fraud Scoring Engine Tests](#part-c-real-fraud-scoring-engine-tests)
- [Part D: Real Database State Tests](#part-d-real-database-state-tests)
- [Part E: Real Kafka Event Pipeline Tests](#part-e-real-kafka-event-pipeline-tests)
- [Part F: Real ML Model Tests](#part-f-real-ml-model-tests)
- [Part G: Real Security Penetration Tests](#part-g-real-security-penetration-tests)
- [Part H: Real Performance / Load Tests](#part-h-real-performance--load-tests)
- [Part I: Real Integration Tests](#part-i-real-integration-tests)
- [Part J: State Adapter Real Data Tests](#part-j-state-adapter-real-data-tests)
- [Part K: Evidence and PDF Dossier Tests](#part-k-evidence-and-pdf-dossier-tests)
- [Part L: Observability and Monitoring Tests](#part-l-observability-and-monitoring-tests)
- [Deliverables](#deliverables)
  - [Test Execution Order](#1-test-execution-order-for-cicd-pipeline)
  - [Credential Requirements](#2-which-tests-need-real-external-credentials)
  - [Offline vs Real Tests](#3-which-tests-can-run-fully-offline-with-mocks)
  - [pytest File Structure](#4-pytest-file-structure-for-backend)
  - [Playwright File Structure](#5-playwright-file-structure-for-frontend)
  - [k6 Scripts](#6-k6-scripts)
  - [Docker Compose](#7-docker-compose-for-full-local-test-environment)
  - [CI/CD Pipeline](#8-cicd-pipeline-yaml)

---

## DOCUMENT CONTROLS

| Field | Value |
|---|---|
| Total Test Cases | 120+ |
| P0 (Critical) | 48 |
| P1 (Important) | 42 |
| P2 (Nice-to-have) | 30 |

---

## PART A: REAL SATELLITE DATA TESTS

**TOOL:** Google Earth Engine (GEE) Python SDK  
**SATELLITE SOURCES:** Sentinel-2 SR, Sentinel-1 SAR, Landsat-8/9

**REAL TEST COORDINATES (actual Indian farm locations):**

| Location | Lat | Lng | Crop | Season | District |
|---|---|---|---|---|---|
| Maharashtra (Vidarbha cotton) | 20.6880 | 77.7210 | Cotton | Kharif | Akola |
| Karnataka (paddy belt) | 15.3647 | 75.1240 | Paddy | Kharif | Haveri |
| Punjab (wheat belt) | 30.9010 | 75.8573 | Wheat | Rabi | Ludhiana |
| Rajasthan (drought-prone) | 26.2389 | 73.0243 | Bajra | Kharif | Jodhpur |
| Telangana (paddy) | 17.3850 | 78.4867 | Paddy | Kharif | Rangareddy |
| Uttar Pradesh (wheat) | 26.8467 | 80.9462 | Wheat | Rabi | Lucknow |

### Test Cases

| TC-ID | SAT-001 |
|---|---|
| **Category** | Satellite |
| **Title** | Real NDVI computation for Kharif season using Sentinel-2 |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | GEE service account configured; `COPERNICUS/S2_SR_HARMONIZED` accessible |
| **Steps** | 1. Authenticate GEE with service account<br>2. Filter Sentinel-2 collection for location (20.6880, 77.7210) + date range 2024-06-01 to 2024-10-31<br>3. Apply cloud mask (SCL band, keep classes 4 and 5)<br>4. Filter cloud cover < 20%<br>5. Compute NDVI = (B8 - B4) / (B8 + B4)<br>6. Reduce to monthly median composites<br>7. Extract pixel value at exact farm centroid<br>8. Return time series with 5+ data points |
| **Input Data** | `{"lat": 20.6880, "lng": 77.7210, "start": "2024-06-01", "end": "2024-10-31", "collection": "COPERNICUS/S2_SR_HARMONIZED"}` |
| **Expected** | - NDVI June: 0.15–0.35 (early crop)<br>- NDVI August: 0.45–0.75 (peak growth)<br>- NDVI October: 0.20–0.45 (harvest)<br>- No NaN or null in time series<br>- Anomaly detection works: if October NDVI drops < 0.15, anomaly = true |
| **Assert** | `ndvi_values.length >= 4`, `mean_ndvi` in range 0.1–0.8, no nulls in array |

| TC-ID | SAT-002 |
|---|---|
| **Category** | Satellite |
| **Title** | NDVI drop validation for claimed flood damage |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | GEE authenticated; claim exists for farmer at Haveri with loss_date 2024-08-15 |
| **Steps** | 1. Compute pre-event mean NDVI (2024-07-01 to 2024-08-14)<br>2. Compute post-event mean NDVI (2024-08-16 to 2024-09-30)<br>3. Compute ndvi_drop = pre_ndvi - post_ndvi<br>4. Compare ndvi_drop with claimed loss_percentage |
| **Input Data** | `{"lat": 15.3647, "lng": 75.1240, "loss_date": "2024-08-15", "claimed_loss_pct": 60}` |
| **Expected** | - If genuine flood: ndvi_drop > 0.20, post_ndvi < 0.25<br>- Fraud signal: ndvi_drop < 0.10 but farmer claims > 60% loss<br>- System must produce ndvi_mismatch = true if drop < 0.15 and loss > 50% |
| **Assert** | API returns `ndvi_mismatch` boolean, `pre_ndvi`, `post_ndvi`, `ndvi_drop` |

| TC-ID | SAT-003 |
|---|---|
| **Category** | Satellite |
| **Title** | Sentinel-1 SAR flood detection test |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | GEE authenticated; `COPERNICUS/S1_GRD` accessible |
| **Steps** | 1. Get pre-flood SAR backscatter (VV + VH polarization)<br>2. Get post-flood SAR backscatter<br>3. Compute backscatter difference<br>4. Apply flood detection threshold (backscatter drop > 3dB in VV)<br>5. Return flood_detected boolean + affected_area_hectares |
| **Input Data** | `{"lat": 17.3850, "lng": 78.4867, "season": "2024 Kharif", "pre_start": "2024-07-01", "pre_end": "2024-08-10", "post_start": "2024-08-16", "post_end": "2024-09-30"}` |
| **Expected** | - If real flood event occurred: flood_detected = true<br>- sar_backscatter_vv_pre in range -15 to -5 dB<br>- sar_backscatter_vv_post drops by > 3dB in flooded pixels<br>- affected_area_hectares > 0 if flood detected |
| **Assert** | API returns `sar_flood_signal`, `affected_area_ha`, `confidence_pct` |

| TC-ID | SAT-004 |
|---|---|
| **Category** | Satellite |
| **Title** | Drought detection via NDVI for Rajasthan Bajra |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | GEE authenticated; 5-year historical NDVI baseline pre-computed or computed on-the-fly |
| **Steps** | 1. Compute NDVI timeseries for Kharif window (2023-07-01 to 2023-09-30)<br>2. Compare against 5-year historical NDVI baseline for same location<br>3. Compute NDVI anomaly: current - historical_mean<br>4. Flag drought if NDVI anomaly < -0.15 |
| **Input Data** | `{"lat": 26.2389, "lng": 73.0243, "start": "2023-07-01", "end": "2023-09-30", "historical_years": 5}` |
| **Expected** | - Historical baseline computed from 2019–2023<br>- Drought years (2023 Rajasthan): anomaly should be negative<br>- ndvi_anomaly value returned (positive or negative)<br>- drought_signal = true if anomaly < -0.15 |
| **Assert** | `ndvi_anomaly` is float, `drought_signal` is boolean |

| TC-ID | SAT-005 |
|---|---|
| **Category** | Satellite |
| **Title** | Land use classification check |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated; Dynamic World or ESA WorldCover accessible |
| **Steps** | 1. Query land use at farm coordinates<br>2. Verify land class = "cropland" or "crops"<br>3. If land class = "urban" or "water body" → land_use_mismatch = true |
| **Input Data** | `{"lat": 30.9010, "lng": 75.8573, "source": "ESA_WorldCover"}` |
| **Expected** | - Ludhiana coordinates: land_use_class = crops<br>- land_use_mismatch = false<br>- If coordinates given are city center → land_use_mismatch = true |
| **Assert** | `land_use_class` string returned, `land_use_mismatch` boolean |

| TC-ID | SAT-006 |
|---|---|
| **Category** | Satellite |
| **Title** | Redis cache validation for NDVI results |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Redis running; backend connected; GEE authenticated |
| **Steps** | 1. Call GET /api/v1/satellite/ndvi (first call → GEE API hit)<br>2. Note response time (should be 3–10 seconds)<br>3. Call same endpoint again immediately (second call → Redis cache hit)<br>4. Note response time (should be < 100ms)<br>5. Verify response bodies are identical<br>6. Verify Redis key exists: ndvi:{lat}:{lng}:{start}:{end}<br>7. Wait 61 minutes → cache expires<br>8. Call again → GEE re-queried (cache miss) |
| **Input Data** | `{"lat": 20.6880, "lng": 77.7210, "start": "2024-06-01", "end": "2024-10-31"}` |
| **Expected** | Second call < 100ms; cache key present; after TTL miss triggers GEE re-query |
| **Assert** | Second response time < 100ms; Redis key present; post-expiry response time > 2s |

| TC-ID | SAT-007 |
|---|---|
| **Category** | Satellite |
| **Title** | GEE authentication failure graceful fallback |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Backend configured to handle GEE failures |
| **Steps** | 1. Set invalid GEE service account credentials in config<br>2. Call GET /api/v1/satellite/ndvi<br>3. Verify response is mock data with is_mock=true flag<br>4. Verify system does not crash<br>5. Verify fraud scoring still proceeds with ndvi_available=false<br>6. Verify audit log records: satellite_data_source = MOCK |
| **Input Data** | Same as SAT-001 but with broken GEE credentials |
| **Expected** | HTTP 200 with `is_mock=true`; fraud scoring not blocked; audit log entry created |
| **Assert** | HTTP 200, `is_mock=true`, fraud score computed, `satellite_data_source=MOCK` in audit |

| TC-ID | SAT-008 |
|---|---|
| **Category** | Satellite |
| **Title** | Cloud cover handling |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated |
| **Steps** | 1. Request NDVI for August (heavy cloud month) at Haveri<br>2. If all images have cloud_cover > 20%: no valid composites<br>3. System should return cloud_cover_warning=true<br>4. System should try wider date range (+/-15 days)<br>5. If still no clear image: return best_available with quality_flag |
| **Input Data** | `{"lat": 15.3647, "lng": 75.1240, "start": "2024-08-01", "end": "2024-08-31"}` |
| **Expected** | `cloud_cover_warning=true` if no valid composites; `quality_flag` present in response |
| **Assert** | `cloud_cover_warning` boolean in response, `quality_flag` present |

| TC-ID | SAT-009 |
|---|---|
| **Category** | Satellite |
| **Title** | Multi-farm batch NDVI processing |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated; 100 farm coordinates in same district available |
| **Steps** | 1. Submit 100 simultaneous satellite NDVI requests (same district)<br>2. GEE processes one regional image for district<br>3. System extracts pixel values for all 100 farm centroids<br>4. Results cached per farm coordinate<br>5. All 100 results returned within 60 seconds |
| **Input Data** | Array of 100 `{lat, lng}` pairs in Akola district |
| **Expected** | Batch processed, no timeout, all 100 scores computed |
| **Assert** | 100 responses received within 60s; all contain `ndvi_values` |

| TC-ID | SAT-010 |
|---|---|
| **Category** | Satellite |
| **Title** | Historical NDVI baseline computation |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated; 3+ years historical data available |
| **Steps** | 1. Compute NDVI for current season<br>2. Compute 3-year historical average NDVI for same location + season<br>3. Return: current_ndvi, historical_mean_ndvi, z_score<br>4. Flag if z_score < -1.5 (statistically anomalous drop) |
| **Input Data** | `{"lat": 20.6880, "lng": 77.7210, "current_start": "2024-06-01", "current_end": "2024-10-31", "historical_years": 3}` |
| **Expected** | historical_mean_ndvi computed, z_score returned |
| **Assert** | `historical_mean_ndvi` float, `z_score` float, `anomaly_flag` boolean |

| TC-ID | SAT-011 |
|---|---|
| **Category** | Satellite |
| **Title** | Crop type phenology validation |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated; crop phenology models loaded |
| **Steps** | 1. Get NDVI time series<br>2. Compare growth curve shape with crop phenology model<br>3. Rice: peak NDVI in days 60–90 after transplant<br>4. Wheat: peak NDVI in days 45–75 after sowing<br>5. If NDVI curve doesn't match crop type → crop_mismatch_flag = true |
| **Input Data** | Crops to test: Rice, Wheat, Cotton, Sugarcane, Bajra with real coordinates |
| **Expected** | `phenology_match` boolean, `peak_ndvi_day` returned |
| **Assert** | `phenology_match` boolean, `peak_ndvi_day` integer |

---

## PART B: REAL WEATHER DATA TESTS

**WEATHER SOURCES:** IMD Open Data / OpenWeatherMap / Open-Meteo (free tier)

### Test Cases

| TC-ID | WEA-001 |
|---|---|
| **Category** | Weather |
| **Title** | Rainfall event verification for flood claim |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Open-Meteo API key configured; claim exists for Haveri farmer with loss_date 2024-08-20 |
| **Steps** | 1. Call GET /api/v1/weather?lat=15.3647&lng=75.1240&date=2024-08-20<br>2. Get: rainfall_mm for that date<br>3. If rainfall_mm > 100: heavy_rainfall_event = true<br>4. If rainfall_mm < 10 but farmer claims flood: weather_mismatch = true |
| **Input Data** | `{"lat": 15.3647, "lng": 75.1240, "date": "2024-08-20", "claimed_event": "flood"}` |
| **Expected** | Haveri August 2024: likely monsoon rainfall (100–200mm); heavy_rainfall_event = true; weather_mismatch = false |
| **Assert** | `rainfall_mm` float, `heavy_rainfall_event` boolean |

| TC-ID | WEA-002 |
|---|---|
| **Category** | Weather |
| **Title** | Drought claim weather corroboration |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | IMD/Open-Meteo accessible; district normal rainfall data available |
| **Steps** | 1. Get cumulative rainfall for July–August 2023 (Kharif window) at Jodhpur<br>2. Compare against IMD district normal rainfall<br>3. If actual < 50% of normal: drought_corroborated = true<br>4. Score fraud lower if drought_corroborated = true |
| **Input Data** | `{"lat": 26.2389, "lng": 73.0243, "start": "2023-07-01", "end": "2023-08-31", "district": "Jodhpur"}` |
| **Expected** | `cumulative_rainfall_mm`, `district_normal_mm`, `drought_corroborated` boolean |
| **Assert** | `cumulative_rainfall_mm` < `district_normal_mm` * 0.5 → `drought_corroborated=true` |

| TC-ID | WEA-003 |
|---|---|
| **Category** | Weather |
| **Title** | Hailstorm claim weather verification |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | IMD severe weather bulletins accessible; hourly weather API available |
| **Steps** | 1. Query hourly weather data for 2024-03-15 at Akola<br>2. Check for hail indicators: temperature_drop_delta, wind_speed, convective_index<br>3. Cross-check with IMD severe weather bulletins for that date<br>4. Return hailstorm_event_detected boolean |
| **Input Data** | `{"lat": 20.6880, "lng": 77.7210, "date": "2024-03-15", "claimed_event": "hail"}` |
| **Expected** | `weather_event_type` string, `hailstorm_event_detected` boolean |
| **Assert** | `hailstorm_event_detected` boolean present in response |

| TC-ID | WEA-004 |
|---|---|
| **Category** | Weather |
| **Title** | Weather data caching behavior |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Redis running |
| **Steps** | 1. First call: GET /api/v1/weather (hits external API)<br>2. Second call same params: served from Redis (24hr TTL)<br>3. Cache key: weather:{lat}:{lng}:{date}<br>4. Cache miss after 24 hours: re-fetched |
| **Input Data** | `{"lat": 15.3647, "lng": 75.1240, "date": "2024-08-20"}` |
| **Expected** | Second call < 50ms; cache key present |
| **Assert** | Second response time < 50ms; Redis key `weather:15.3647:75.1240:2024-08-20` exists |

| TC-ID | WEA-005 |
|---|---|
| **Category** | Weather |
| **Title** | Weather API unavailable fallback |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Backend handles weather API failures gracefully |
| **Steps** | 1. Disable weather API credentials<br>2. Call /api/v1/weather<br>3. Verify graceful response: weather_available=false<br>4. Verify fraud scoring continues: weather_feature skipped<br>5. Score computed with weather_feature_available=false flag |
| **Input Data** | Any valid lat/lng/date |
| **Expected** | No 500 error; fraud score still computed with degraded input |
| **Assert** | HTTP 200, `weather_available=false`, fraud score computed, `weather_feature_available=false` |

| TC-ID | WEA-006 |
|---|---|
| **Category** | Weather |
| **Title** | Cyclone claim weather corroboration |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | IMD cyclone track data accessible |
| **Steps** | 1. Query wind speed + pressure for cyclone landfall date at Coastal Odisha<br>2. Cross-reference IMD cyclone track data<br>3. If location within 200km of cyclone path: cyclone_event = true<br>4. cyclone_event = true → fraud score significantly lowered |
| **Input Data** | `{"lat": 19.8, "lng": 85.6, "date": "2024-05-26", "claimed_event": "cyclone"}` |
| **Expected** | `cyclone_event` boolean, `wind_speed_kmh` returned |
| **Assert** | `cyclone_event` boolean, `wind_speed_kmh` float |

| TC-ID | WEA-007 |
|---|---|
| **Category** | Weather |
| **Title** | Multi-date weather aggregation |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Weather API accessible |
| **Steps** | 1. Get weather for loss_date - 3 days to loss_date + 3 days<br>2. Compute: max_rainfall, avg_temperature, max_wind_speed<br>3. Return aggregated weather window result |
| **Input Data** | `{"lat": 20.6880, "lng": 77.7210, "loss_date": "2024-08-20", "window_days": 3}` |
| **Expected** | 7 data points, aggregated stats computed |
| **Assert** | 7 daily records, `max_rainfall`, `avg_temperature`, `max_wind_speed` present |

| TC-ID | WEA-008 |
|---|---|
| **Category** | Weather |
| **Title** | Temperature anomaly for frost/cold wave claims |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Historical temperature baseline available |
| **Steps** | 1. Get minimum temperature for claimed frost date in Punjab<br>2. Compare against 10-year historical January minimum<br>3. If actual_min_temp < historical_min - 4°C: frost_event = true |
| **Input Data** | `{"lat": 30.9010, "lng": 75.8573, "date": "2024-01-15", "claimed_event": "frost"}` |
| **Expected** | `actual_min_temp`, `historical_baseline_temp`, `frost_event` boolean |
| **Assert** | `actual_min_temp` < (`historical_baseline_temp` - 4) → `frost_event=true` |

---

## PART C: REAL FRAUD SCORING ENGINE TESTS

### Test Cases

| TC-ID | FRAUD-001 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | Genuine low-risk claim full scoring |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Claim exists in DB with complete evidence; C++ engine or Python fallback available |
| **Input Data** | `{"claim_amount": 45000, "sum_insured": 50000, "loss_percentage": 60.0, "officer_loss_pct": 58.0, "ndvi_before": 0.62, "ndvi_after": 0.28, "ndvi_anomaly": true, "historical_claims": 1, "historical_approved": 1, "days_since_last_claim": 365, "same_location_claims": 0, "geo_cluster_claims": 1, "weather_correlated": true, "photo_count": 4, "gps_verified": true, "crop_season_match": true}` |
| **Expected** | score: 5–25 (low); risk_level: LOW; auto_approve: true; all factor weights low |
| **Assert** | `score < 30`, `risk_level = "LOW"`, `auto_approve = true` |

| TC-ID | FRAUD-002 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | High-fraud synthetic claim full scoring |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Same as FRAUD-001 |
| **Input Data** | `{"claim_amount": 95000, "sum_insured": 40000, "loss_percentage": 100.0, "officer_loss_pct": 20.0, "ndvi_before": 0.68, "ndvi_after": 0.61, "ndvi_anomaly": false, "historical_claims": 5, "historical_approved": 1, "days_since_last_claim": 12, "same_location_claims": 3, "geo_cluster_claims": 8, "weather_correlated": false, "photo_count": 1, "gps_verified": false, "crop_season_match": false}` |
| **Expected** | score: 85–100; risk_level: CRITICAL; factors: amount_inflation HIGH, ndvi_mismatch HIGH, officer_discrepancy HIGH, geo_cluster HIGH, weather_mismatch HIGH |
| **Assert** | `score > 80`, `risk_level = "CRITICAL"`, at least 5 factors flagged HIGH |

| TC-ID | FRAUD-003 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | All 47 features computed correctly |
| **Type** | Unit / Integration |
| **Priority** | P0 |
| **Preconditions** | Feature assembler service available; test input/output pairs defined |
| **Steps** | Test each feature individually with known input/output pairs. See detailed feature groups below. |
| **Input Data** | Feature Group A–H test vectors (see sub-cases) |
| **Expected** | Each feature produces correct flag/value for given input |
| **Assert** | All 47 feature assertions pass |

**FRAUD-003 Feature Group Detail Tables:**

| Feature | Test Input | Expected Output |
|---|---|---|
| A1 amount_to_insured_ratio | claim=61000, insured=50000 | ratio=1.22 → flag=true |
| A2 loss_pct_vs_area_ratio | affected=2ha, insured=5ha, loss=90% | inconsistency_flag=true |
| A3 claim_count_same_policy | 2 claims same policy this season | flag=true |
| A4 days_since_policy_start | policy started 3 days ago | suspicious_timing=true |
| A5 premium_to_claim_ratio | premium=500, claim=200000 | ratio=400x → flag=true |
| B1 historical_approval_rate | 5 claims, 1 approved | rate=0.20 → high_risk=true |
| B2 historical_claim_frequency | 3 claims in 24 months | frequency=1.5/year → flag=true |
| B3 avg_historical_loss_pct | previous claims all at 95%+ | consistent_high_loss=true |
| B4 previous_fraud_flags | 2 prior flagged claims | flag=true |
| B5 time_between_claims | last claim 15 days ago | too_recent=true |
| C1 claims_in_5km_radius | 6 claims within 5km this season | geo_cluster=true |
| C2 farm_coordinates_match_registered | inspection GPS vs registered land mismatch > 500m | flag=true |
| C3 multiple_claims_same_gps | exact same GPS as 2 other claims | identical_location=true |
| C4 district_fraud_rate | district has 30% fraud rate | district_risk=high |
| C5 cross_border_claim | farm in Karnataka, claim filed via Maharashtra adapter | flag=true |
| D1 ndvi_drop_magnitude | pre=0.65, post=0.62 | drop=0.03 → insufficient_drop=true |
| D2 ndvi_vs_loss_pct_consistency | ndvi_drop=0.03, loss_pct=80% | inconsistent=true |
| D3 ndvi_historical_anomaly_zscore | z_score=-0.5 | anomaly=false |
| D4 vegetation_recovery_rate | NDVI recovering fast after claimed date | false_event_flag=true |
| D5 crop_type_phenology_match | NDVI curve doesn't match claimed rice | crop_mismatch=true |
| D6 sar_flood_signal | no SAR backscatter change | flood_not_corroborated=true |
| D7 land_use_classification | land_use=urban | land_fraud=true |
| E1 rainfall_event_corroboration | rainfall_mm=2 on flood claim date | weather_mismatch=true |
| E2 drought_index_score | SPI = -0.3 | insufficient_drought_for_claim |
| E3 temperature_anomaly | frost claim but temp=18°C | frost_mismatch=true |
| E4 wind_speed_for_cyclone_claim | wind_speed=25kmh on cyclone claim date | mismatch=true |
| E5 weather_station_distance | nearest station = 120km away | low_confidence=true |
| F1 officer_vs_farmer_loss_pct_delta | farmer=90%, officer=25% | delta=65% → high_discrepancy=true |
| F2 inspection_photo_count | 0 photos submitted | insufficient_evidence=true |
| F3 gps_inspection_vs_claim_location | inspection GPS 2km from registered farm | location_mismatch=true |
| F4 inspection_delay_days | inspection done 45 days after claim | delayed_inspection=true |
| F5 same_officer_multiple_approvals | officer approved 15 claims in same village | officer_bias=true |
| G1 claim_submission_time | submitted at 2:30am | unusual_time=true |
| G2 form_fill_speed | all fields filled in 45 seconds | bot_suspicion=true |
| G3 seasonal_claim_timing | claim submitted 2 days before policy expiry | policy_expiry_rush=true |
| G4 multiple_edits_before_submit | claim edited 8 times | suspicious_edit_pattern=true |
| G5 weekend_submission | submitted on Sunday | low_officer_availability flag |
| H1 shared_ip_multiple_claims | 3 farmers submitting from same IP | coordinated_fraud_flag=true |
| H2 device_fingerprint_shared | same device_id used by 2 farmers | shared_device=true |
| H3 referrer_network | farmer linked to 4 other flagged farmers | network_fraud=true |
| H4 bank_account_shared | same bank account on 2 different farmer profiles | account_fraud=true |
| H5 aadhar_reuse | same Aadhar on 2 accounts | identity_fraud=true |

| TC-ID | FRAUD-004 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | C++ engine binary integration test |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | C++ source built; binary exists at `fraud_engine/fraud_engine.exe` |
| **Steps** | 1. Build C++ engine: cmake .. && make<br>2. Pass valid JSON via stdin<br>3. Read JSON output via stdout<br>4. Verify no segfault, no infinite loop<br>5. Verify score in range 0–100<br>6. Verify factors dictionary present<br>7. Verify risk_level in [low, medium, high, critical]<br>8. Run 1000 consecutive requests: no memory leak |
| **Input Data** | Valid 47-feature JSON vector |
| **Expected** | process exits 0, valid JSON output every time, no memory leaks |
| **Assert** | exit code 0, `score` in [0,100], `risk_level` in enum, `factors` dict present |

| TC-ID | FRAUD-005 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | Python fallback scorer when C++ engine unavailable |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Backend configured for fallback |
| **Steps** | 1. Remove/rename C++ binary<br>2. Submit claim and trigger scoring<br>3. Python rule-based scorer activates automatically<br>4. Score computed with reduced feature set<br>5. Response includes: engine_used = python_fallback<br>6. Audit log: engine_fallback event recorded |
| **Expected** | 200 response, score returned, fallback flagged |
| **Assert** | HTTP 200, `score` present, `engine_used="python_fallback"`, audit log entry |

| TC-ID | FRAUD-006 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | SHAP explainability output validation |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | SHAP explainer loaded; model inference endpoint available |
| **Steps** | 1. Compute fraud score for test claim<br>2. Verify SHAP values returned for all available features<br>3. Verify top_5_factors array returned<br>4. Verify each factor has: name, weight, direction<br>5. Verify human_readable_explanation text generated<br>6. Verify sum of absolute SHAP weights ≈ total score (±10%) |
| **Expected** | shap_values dict, top_5_factors array, explanation string |
| **Assert** | `shap_values` dict, `top_5_factors` array length 5, `explanation` string, SHAP sum ≈ score ±10% |

| TC-ID | FRAUD-007 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | Confidence score for incomplete data |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Scoring engine handles missing features gracefully |
| **Steps** | 1. Submit claim with no satellite data<br>2. Submit claim with no inspection<br>3. Submit claim with no historical data (first-time farmer) |
| **Expected** | confidence_score = 0.45 (partial data); missing_features flagged; score still computed but with uncertainty range; reviewer alerted to low confidence |
| **Assert** | `confidence_score` float, `missing_features` array, `uncertainty_range` present |

| TC-ID | FRAUD-008 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | Score recalculation after new evidence |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Claim already scored; new evidence arrives |
| **Steps** | 1. Score computed after initial claim: score = 55<br>2. Inspection completed with high discrepancy<br>3. Satellite data arrives confirming no NDVI drop<br>4. Score recomputed with all evidence: score = 78<br>5. New scoring_results record created<br>6. Old score preserved (no deletion)<br>7. latest_score flag on new record |
| **Expected** | 2 scoring_results records, latest_score correct |
| **Assert** | 2 records in `fraud_scores` for same claim_id; newest has `latest_score=true` |

| TC-ID | FRAUD-009 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | State adapter modifies scoring thresholds |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Maharashtra adapter loaded with NDVI threshold = 0.20 |
| **Steps** | 1. Maharashtra adapter: NDVI threshold = 0.20 (stricter)<br>2. Compute score for claim with ndvi_drop = 0.17<br>3. With default adapter: ndvi_mismatch = false<br>4. With Maharashtra adapter: ndvi_mismatch = true → score increases<br>5. Verify adapter config used in feature computation |
| **Expected** | Score differs by adapter; adapter_id recorded in fraud_score |
| **Assert** | `score_mh != score_default`; `adapter_id` present in fraud_score record |

| TC-ID | FRAUD-010 |
|---|---|
| **Category** | Fraud Scoring |
| **Title** | Reviewer manual override with audit trail |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Reviewer role exists; claim scored and in OFFICER_REVIEW status |
| **Steps** | 1. Auto-computed score = 82 (critical → auto-reject)<br>2. Reviewer disagrees, overrides to approved<br>3. Override requires: justification text (> 50 chars)<br>4. Override creates fraud_score record: is_override=true, override_by=reviewer_id<br>5. Audit log: FRAUD_SCORE_OVERRIDE action recorded<br>6. Original score preserved in fraud_score with is_override=false |
| **Expected** | 2 fraud_score records; audit entry; decision = approved |
| **Assert** | 2 `fraud_score` records for claim; `is_override=true` on newest; audit log entry with action `FRAUD_SCORE_OVERRIDE` |

---

## PART D: REAL DATABASE STATE TESTS

### Test Cases

| TC-ID | DB-001 |
|---|---|
| **Category** | Database |
| **Title** | Transaction atomicity — claim + evidence |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | PostgreSQL running; claim and evidence tables exist |
| **Steps** | 1. Begin: submit claim + upload 3 photos<br>2. Photo 3 upload fails mid-transaction<br>3. Verify: claim rolled back (not partially saved)<br>4. Verify: DB has 0 photos for claim_id |
| **Expected** | No orphaned records; transaction fully rolled back |
| **Assert** | `SELECT COUNT(*) FROM claims WHERE claim_id = X` = 0; `SELECT COUNT(*) FROM evidence_items WHERE claim_id = X` = 0 |

| TC-ID | DB-002 |
|---|---|
| **Category** | Database |
| **Title** | Unique constraint enforcement at DB level |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Unique index on `claims.claim_number` exists |
| **Steps** | 1. Insert 2 claims with same claim_number directly via SQL<br>2. Verify DB throws unique violation<br>3. Verify API catches this and returns 409 (not 500) |
| **Expected** | DB unique violation; API returns 409 |
| **Assert** | HTTP 409, `error_code = "DUPLICATE_CLAIM_NUMBER"` |

| TC-ID | DB-003 |
|---|---|
| **Category** | Database |
| **Title** | Foreign key cascade behavior |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Farmer, claim, inspection, fraud_score records linked by FK |
| **Steps** | 1. Create farmer → create claim → create inspection → create fraud_score<br>2. Delete farmer (soft delete: is_active=false)<br>3. Verify: claims still exist (not hard deleted)<br>4. Hard delete farmer (admin action)<br>5. Verify: CASCADE behavior per schema |
| **Expected** | Soft delete preserves children; hard delete cascades per ON DELETE rules |
| **Assert** | After soft delete: `SELECT COUNT(*) FROM claims WHERE farmer_id = X` > 0; after hard delete: 0 |

| TC-ID | DB-004 |
|---|---|
| **Category** | Database |
| **Title** | Index performance on claims table with 1M records |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | DB seeded with 1,000,000 claim records; index on `(farmer_id, status)` exists |
| **Steps** | 1. Seed 1,000,000 claim records<br>2. Run: `SELECT * FROM claims WHERE farmer_id = :id AND status = 'under_review'`<br>3. Measure query time with `EXPLAIN ANALYZE`<br>4. Verify index on (farmer_id, status) used<br>5. Query time < 50ms |
| **Expected** | EXPLAIN shows index scan; duration < 50ms |
| **Assert** | `EXPLAIN` output contains "Index Scan"; execution time < 50ms |

| TC-ID | DB-005 |
|---|---|
| **Category** | Database |
| **Title** | Flyway migration integrity |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Flyway CLI installed; migration files V1–V26 present |
| **Steps** | 1. Run all migrations on fresh database: V1 → V26<br>2. Verify flyway_schema_history has 26 records<br>3. All checksums match<br>4. Verify all expected tables exist<br>5. Attempt to modify V5 migration file<br>6. Re-run flyway → checksum mismatch error raised |
| **Expected** | Migration history clean; tamper detection works |
| **Assert** | `flyway_schema_history` has 26 rows; checksums match; tampered file triggers checksum mismatch error |

| TC-ID | DB-006 |
|---|---|
| **Category** | Database |
| **Title** | Concurrent claim submission race condition |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Unique constraint on `(policy_id, loss_date, loss_type)` exists |
| **Steps** | 1. Same farmer submits 2 identical claims simultaneously (parallel threads)<br>2. Both hit DB at same time<br>3. DB unique constraint prevents duplicate<br>4. One succeeds, one gets 409 |
| **Expected** | Exactly 1 claim created; no duplicates |
| **Assert** | `SELECT COUNT(*) FROM claims WHERE farmer_id = X AND policy_id = Y AND loss_date = Z` = 1 |

| TC-ID | DB-007 |
|---|---|
| **Category** | Database |
| **Title** | Audit log immutability |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Audit logs table exists; DB policy or app layer prevents mutation |
| **Steps** | 1. Create audit log entry<br>2. Attempt UPDATE on audit_logs table → should be denied<br>3. Attempt DELETE on audit_logs → denied<br>4. Only INSERT allowed |
| **Expected** | No UPDATE/DELETE possible on audit_logs |
| **Assert** | UPDATE/DELETE queries return 0 rows affected or raise permission error |

| TC-ID | DB-008 |
|---|---|
| **Category** | Database |
| **Title** | Archival of old claims (data retention) |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Archival job configured; `claims_archive` table exists |
| **Steps** | 1. Create claims from 7 years ago (set created_at = NOW() - interval '7 years')<br>2. Run archival job<br>3. Verify: old claims moved to claims_archive table<br>4. Verify: main claims table no longer contains them<br>5. Verify: archived claims still queryable via archive endpoint |
| **Expected** | Claims archived correctly after retention period |
| **Assert** | `SELECT COUNT(*) FROM claims WHERE created_at < NOW() - INTERVAL '7 years'` = 0; `SELECT COUNT(*) FROM claims_archive` > 0 |

| TC-ID | DB-009 |
|---|---|
| **Category** | Database |
| **Title** | Full-text search on claim description |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | 10,000 claims seeded; GIN index on description exists |
| **Steps** | 1. Store 10,000 claims with varied descriptions<br>2. Search: "heavy rain damaged paddy crop"<br>3. Verify: relevant claims returned<br>4. Verify: GIN index on description used<br>5. Search time < 200ms |
| **Expected** | Relevant results returned; GIN index used; < 200ms |
| **Assert** | `EXPLAIN` shows GIN index scan; execution time < 200ms; results contain matching claims |

| TC-ID | DB-010 |
|---|---|
| **Category** | Database |
| **Title** | JSONB field querying for fraud factors |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | `fraud_scores.factors` stored as JSONB; GIN index exists |
| **Steps** | 1. Query: `claims where factors->>'ndvi_mismatch' = 'true'`<br>2. Verify correct claims returned<br>3. Verify GIN index on JSONB field used |
| **Expected** | JSONB query works; index used |
| **Assert** | `EXPLAIN` shows GIN index; correct claims returned |

---

## PART E: REAL KAFKA EVENT PIPELINE TESTS

### Test Cases

| TC-ID | KAFKA-001 |
|---|---|
| **Category** | Kafka |
| **Title** | End-to-end claim.submitted event flow |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Kafka broker running; producers and consumers deployed; topics created |
| **Steps** | 1. Farmer submits claim via API<br>2. Verify: claim.submitted event published to Kafka topic<br>3. Consume event: verify payload contains claim_id, farmer_id, timestamp, idempotency_key<br>4. Scoring consumer receives event → triggers fraud scoring<br>5. Audit consumer receives event → writes audit_log entry<br>6. Notification consumer receives event → creates notification for farmer<br>7. All 3 consumers process within 5 seconds |
| **Expected** | 3 side effects happen, all within 5 seconds |
| **Assert** | `fraud_scores` record created; `audit_logs` entry exists; `notifications` record created; all timestamps within 5s of submission |

| TC-ID | KAFKA-002 |
|---|---|
| **Category** | Kafka |
| **Title** | Duplicate event idempotency (same idempotency_key) |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Redis idempotency store available; scoring consumer checks Redis before processing |
| **Steps** | 1. Publish score.requested event with idempotency_key = "test-key-001"<br>2. Publish same event again (retry simulation)<br>3. Scoring consumer checks idempotency_key in Redis<br>4. Second event: scoring NOT triggered again<br>5. Original score preserved |
| **Expected** | Exactly 1 fraud_score record created, not 2 |
| **Assert** | `SELECT COUNT(*) FROM fraud_scores WHERE claim_id = X` = 1 |

| TC-ID | KAFKA-003 |
|---|---|
| **Category** | Kafka |
| **Title** | Dead letter queue behavior |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | DLQ topic configured; retry policy = 3 attempts |
| **Steps** | 1. Publish malformed event (missing required fields)<br>2. Consumer fails to process → retries 3 times<br>3. After 3 failures → message moved to DLQ topic: {topic}.dlq<br>4. Alert triggered: DLQ message count > 0<br>5. DLQ message readable for manual investigation |
| **Expected** | DLQ populated; alert fired; original topic unblocked |
| **Assert** | `kafka-console-consumer` on `{topic}.dlq` shows malformed message; alert log entry exists |

| TC-ID | KAFKA-004 |
|---|---|
| **Category** | Kafka |
| **Title** | Consumer lag monitoring |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | Monitoring stack (Prometheus + Grafana) running; lag metrics exported |
| **Steps** | 1. Produce 10,000 events rapidly<br>2. Monitor consumer lag<br>3. Lag should reduce to 0 within 60 seconds<br>4. If lag > 1000 messages for > 5 minutes: alert triggered |
| **Expected** | Lag clears within 60s; alert threshold defined |
| **Assert** | `kafka_consumer_lag` gauge = 0 within 60s; alert rule exists for lag > 1000 |

| TC-ID | KAFKA-005 |
|---|---|
| **Category** | Kafka |
| **Title** | Kafka broker failure recovery |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Backend has internal event queue fallback; Kafka cluster has replication |
| **Steps** | 1. Stop Kafka broker mid-processing<br>2. API continues accepting claims (graceful degradation)<br>3. Events queued internally<br>4. Restart Kafka broker<br>5. Queued events flushed and processed<br>6. No events lost |
| **Expected** | Zero event loss; processing resumes after recovery |
| **Assert** | All claims submitted during outage have corresponding Kafka events after recovery; no data loss in DB |

| TC-ID | KAFKA-006 |
|---|---|
| **Category** | Kafka |
| **Title** | All 14 required topics exist |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Kafka admin client accessible |
| **Steps** | 1. Connect to Kafka admin client<br>2. List all topics<br>3. Verify all 14 topics exist with correct names<br>4. Verify partition count >= 3 for high-throughput topics |
| **Expected** | All 14 topics present with correct partition counts |
| **Assert** | AdminClient `listTopics()` contains all 14 names; `claim.submitted` partitions >= 3 |

**Required Topics:** claim.created, claim.submitted, claim.validated, inspection.assigned, inspection.completed, evidence.uploaded, score.requested, score.completed, score.flagged, decision.made, notification.dispatch.requested, audit.event.created, model.deployed, adapter.updated

| TC-ID | KAFKA-007 |
|---|---|
| **Category** | Kafka |
| **Title** | Event ordering within partition |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Producer uses claim_id as partition key |
| **Steps** | 1. All events for same claim_id go to same partition (key = claim_id)<br>2. Events arrive in order: created → submitted → scored → decided<br>3. Consumer processes in correct order |
| **Expected** | Per-partition ordering maintained |
| **Assert** | Event timestamps for single claim_id are monotonically increasing per partition |

---

## PART F: REAL ML MODEL TESTS

### Test Cases

| TC-ID | ML-001 |
|---|---|
| **Category** | ML Model |
| **Title** | Model inference with real 47-feature vector |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Model artifact loaded in ml-service; inference endpoint available |
| **Steps** | 1. Assemble complete 47-feature vector from real claim data<br>2. Call ML model inference endpoint<br>3. Verify score output 0–100<br>4. Verify confidence_score 0–1<br>5. Verify SHAP explanation returned<br>6. Latency < 500ms |
| **Expected** | score in range, SHAP values, latency target met |
| **Assert** | `score` in [0,100], `confidence_score` in [0,1], `shap_values` present, latency < 500ms |

| TC-ID | ML-002 |
|---|---|
| **Category** | ML Model |
| **Title** | Model offline evaluation on historical labeled data |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | 1000 labeled historical claims available (fraud=1, genuine=0) |
| **Steps** | 1. Load 1000 labeled historical claims<br>2. Run all through current model<br>3. Compute metrics: AUC-ROC > 0.85, Precision@0.8 > 0.75, Recall@0.5 > 0.70, F1 > 0.78, FPR < 0.15 |
| **Expected** | All metrics above threshold |
| **Assert** | `auc_roc > 0.85`, `precision > 0.75`, `recall > 0.70`, `f1 > 0.78`, `fpr < 0.15` |

| TC-ID | ML-003 |
|---|---|
| **Category** | ML Model |
| **Title** | Champion vs challenger shadow run |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Both champion and challenger model versions loaded; shadow mode enabled |
| **Steps** | 1. Both champion and challenger model loaded<br>2. 100 real claims scored by both<br>3. Champion score used for decisions<br>4. Challenger score logged only<br>5. Score divergence > 20 points logged for analysis<br>6. No challenger score affects any claim decision |
| **Expected** | Divergence log populated; decisions use champion only |
| **Assert** | `shadow_scores` table has 100 challenger records; `fraud_scores` has 100 champion records; no decision references challenger |

| TC-ID | ML-004 |
|---|---|
| **Category** | ML Model |
| **Title** | Feature drift detection |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Drift monitoring job configured; training data distribution baseline stored |
| **Steps** | 1. Run batch scoring on last 7 days of claims<br>2. Compute feature distributions<br>3. Compare against training data distribution<br>4. If KL divergence > 0.3 for any feature: drift_alert = true<br>5. Alert sent to data science team |
| **Expected** | Drift computed; alert mechanism works |
| **Assert** | `drift_report` generated; if KL > 0.3, alert record in `alerts` table |

| TC-ID | ML-005 |
|---|---|
| **Category** | ML Model |
| **Title** | Class imbalance handling |
| **Type** | Unit / Integration |
| **Priority** | P1 |
| **Preconditions** | Training config specifies class_weight or SMOTE |
| **Steps** | 1. Verify model not biased toward always predicting genuine<br>2. Precision/recall tradeoff appropriate<br>3. SMOTE or class_weight = balanced used in training config<br>4. Model recall for fraud class > 0.70 |
| **Expected** | recall_fraud > 0.70 |
| **Assert** | `recall_fraud > 0.70` on test set; training config contains `class_weight="balanced"` or SMOTE flag |

| TC-ID | ML-006 |
|---|---|
| **Category** | ML Model |
| **Title** | Model version rollback |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Model registry API available; v1 and v2 artifacts stored |
| **Steps** | 1. Deploy new model version v2<br>2. v2 shows degraded AUC on shadow run<br>3. Admin rolls back to v1 via model registry<br>4. All new scoring requests use v1<br>5. Kafka event: model.deployed with version=v1 (rollback)<br>6. No downtime during rollback |
| **Expected** | Rollback completes in < 30 seconds; zero scoring errors |
| **Assert** | `GET /model/current` returns v1; no 5xx errors during rollback window; `model.deployed` Kafka event with version=v1 |

| TC-ID | ML-007 |
|---|---|
| **Category** | ML Model |
| **Title** | Fairness check across states |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | 200 genuine claims per state available; demographic data clean |
| **Steps** | 1. Score 200 genuine claims from each of 6 states<br>2. Compute false positive rate per state<br>3. Verify no state has FPR > 2x any other state<br>4. Check farmer demographic data not a hidden feature proxy |
| **Expected** | FPR across states within 2x bound |
| **Assert** | `max(fpr_by_state) / min(fpr_by_state) < 2.0` |

---

## PART G: REAL SECURITY PENETRATION TESTS

### Test Cases

| TC-ID | SEC-001 |
|---|---|
| **Category** | Security |
| **Title** | SQL injection in all 40+ text input fields |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Application running; Burp Suite or similar tool available |
| **Steps** | 1. Identify all text input endpoints (registration, claim description, rejection notes, etc.)<br>2. Inject SQL payloads: `'; DROP TABLE farmers; --`, `1 OR 1=1`, etc.<br>3. Verify parameterized queries prevent execution<br>4. Verify no error messages leak DB schema |
| **Expected** | All injections blocked; no DB modification; generic error returned |
| **Assert** | HTTP 400/422 for all injections; DB tables intact; no schema info in response |

| TC-ID | SEC-002 |
|---|---|
| **Category** | Security |
| **Title** | XSS in claim description, farmer name, rejection notes |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Frontend rendering claim data; backend storing text fields |
| **Steps** | 1. Submit XSS payloads: `<script>alert('xss')</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`<br>2. Verify payloads escaped in DB and response<br>3. Verify frontend renders as text, not HTML |
| **Expected** | Payloads escaped; no script execution |
| **Assert** | Response contains `&lt;script&gt;` or similar escaping; browser console shows no alerts |

| TC-ID | SEC-003 |
|---|---|
| **Category** | Security |
| **Title** | JWT algorithm confusion: none, RS256→HS256 |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | JWT library configured; token generation endpoint available |
| **Steps** | 1. Generate token with `alg: "none"`<br>2. Submit to protected endpoint<br>3. Generate token with `alg: "RS256"` but sign with HS256 using public key<br>4. Submit to protected endpoint |
| **Expected** | Both rejected with 401 |
| **Assert** | HTTP 401 for both tokens; no access granted |

| TC-ID | SEC-004 |
|---|---|
| **Category** | Security |
| **Title** | IDOR: farmer accesses another farmer's claim via UUID brute force |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Two farmers with claims exist; JWT tokens for each |
| **Steps** | 1. Farmer A logs in, gets JWT<br>2. Farmer A calls GET /api/v1/claims/{FarmerB-claim-id}<br>3. Verify system checks claim ownership against JWT userId<br>4. Verify 403 returned |
| **Expected** | 403 Forbidden; no claim data leaked |
| **Assert** | HTTP 403; response contains no Farmer B data |

| TC-ID | SEC-005 |
|---|---|
| **Category** | Security |
| **Title** | Mass assignment: farmer sends role=admin in PUT /profile body |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Profile update endpoint exists |
| **Steps** | 1. Farmer sends PUT /api/v1/farmer/profile with body containing `"role": "admin"`<br>2. Verify backend ignores or rejects role field<br>3. Verify farmer record unchanged |
| **Expected** | Role field ignored; farmer remains farmer |
| **Assert** | DB `farmers` table: `role` column unchanged; HTTP 200 but role not updated |

| TC-ID | SEC-006 |
|---|---|
| **Category** | Security |
| **Title** | File upload polyglot: image/PHP polyglot file |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Evidence upload endpoint accepts images |
| **Steps** | 1. Create polyglot file: valid JPEG header + PHP code (`<?php system($_GET['cmd']); ?>`)<br>2. Upload as evidence photo<br>3. Verify file stored as static asset, not executed<br>4. Verify file hash checked; if same hash uploaded twice, deduplicated |
| **Expected** | File stored but never executed; content-type verified as image |
| **Assert** | File saved with `.jpg` extension; HTTP request to file URL returns raw image bytes, not PHP output |

| TC-ID | SEC-007 |
|---|---|
| **Category** | Security |
| **Title** | SSRF: satellite endpoint with internal IP as lat/lng |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Satellite NDVI endpoint accepts lat/lng parameters |
| **Steps** | 1. Call GET /api/v1/satellite/ndvi?lat=169.254.169.254&lng=latest/meta-data/iam<br>2. Verify backend validates lat/lng ranges (-90 to 90, -180 to 180)<br>3. Verify no internal network requests made |
| **Expected** | 400 Bad Request; no internal API calls |
| **Assert** | HTTP 400; server logs show no outbound requests to 169.254.x.x |

| TC-ID | SEC-008 |
|---|---|
| **Category** | Security |
| **Title** | Path traversal: ../../etc/passwd as filename |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | File download endpoint uses filename parameter |
| **Steps** | 1. Request PDF dossier with filename `../../etc/passwd`<br>2. Verify backend sanitizes filename<br>3. Verify only dossier directory accessed |
| **Expected** | 400 Bad Request; no filesystem traversal |
| **Assert** | HTTP 400; no access outside allowed storage path |

| TC-ID | SEC-009 |
|---|---|
| **Category** | Security |
| **Title** | Rate limit bypass via X-Forwarded-For spoofing |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Rate limiter uses client IP; proxy headers forwarded |
| **Steps** | 1. Send 100 requests with `X-Forwarded-For: 1.1.1.1`, then `2.2.2.2`, etc.<br>2. Verify rate limiter uses real client IP (from connection), not spoofed header<br>3. Verify 429 returned after true IP limit exceeded |
| **Expected** | Rate limit applied to real IP; spoofing ineffective |
| **Assert** | HTTP 429 after true IP exceeds limit; no bypass with rotated X-Forwarded-For |

| TC-ID | SEC-010 |
|---|---|
| **Category** | Security |
| **Title** | Brute force OTP: 1000 OTP attempts |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | OTP verification endpoint exists; rate limiting configured |
| **Steps** | 1. Send 1000 verify-OTP requests with wrong codes for same mobile<br>2. Verify account temporarily locked after N attempts (e.g., 5)<br>3. Verify exponential backoff on retries<br>4. Verify legitimate user can still log in after lockout expires |
| **Expected** | Account locked after 5 attempts; no successful brute force |
| **Assert** | HTTP 429 or 403 after lockout; no successful authentication in 1000 attempts |

| TC-ID | SEC-011 |
|---|---|
| **Category** | Security |
| **Title** | Token replay after logout |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Logout endpoint exists; JWT blacklisting or short TTL configured |
| **Steps** | 1. User logs in, receives JWT<br>2. User calls logout<br>3. Same JWT sent to protected endpoint<br>4. Verify token rejected (blacklisted or expired) |
| **Expected** | 401 Unauthorized after logout |
| **Assert** | HTTP 401 on protected endpoint after logout call |

| TC-ID | SEC-012 |
|---|---|
| **Category** | Security |
| **Title** | Refresh token theft and reuse after rotation |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Refresh token rotation enabled; Redis stores issued tokens |
| **Steps** | 1. User logs in, gets access + refresh tokens<br>2. Refresh token used to get new access token<br>3. Old refresh token used again<br>4. Verify old refresh token invalidated<br>5. Verify family of tokens revoked if reuse detected |
| **Expected** | Old refresh token rejected; token family revoked on reuse |
| **Assert** | HTTP 401 on second refresh; all tokens in family invalidated |

| TC-ID | SEC-013 |
|---|---|
| **Category** | Security |
| **Title** | Horizontal privilege escalation via claim_id enumeration |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Sequential or guessable claim IDs not used (UUID recommended) |
| **Steps** | 1. Attacker enumerates claim IDs: `GET /api/v1/claims/{uuid}`<br>2. Verify UUIDs are cryptographically random (v4)<br>3. Verify role-based access control on every endpoint<br>4. Officer cannot access claims outside assigned district |
| **Expected** | No claims accessible without proper authorization |
| **Assert** | HTTP 403 for all unauthorized claim access attempts |

| TC-ID | SEC-014 |
|---|---|
| **Category** | Security |
| **Title** | CSV injection in exported reports |
| **Type** | Security |
| **Priority** | P1 |
| **Preconditions** | Admin can export reports as CSV |
| **Steps** | 1. Create farmer with name `=CMD|' /C calc'!A0`<br>2. Export claims CSV<br>3. Verify formula injection neutralized (prefixed with `'`) |
| **Expected** | CSV safe to open in Excel; no formula execution |
| **Assert** | CSV cell value starts with `'` or is quoted safely |

| TC-ID | SEC-015 |
|---|---|
| **Category** | Security |
| **Title** | TOTP backup code brute force (8 codes, 8 chars each) |
| **Type** | Security |
| **Priority** | P1 |
| **Preconditions** | Backup codes generated for admin login |
| **Steps** | 1. Attempt all 8 backup codes sequentially<br>2. Verify each code single-use<br>3. Verify rate limiting on backup code attempts |
| **Expected** | Each code works once; second use fails; brute force blocked |
| **Assert** | First use: HTTP 200; second use of same code: HTTP 401; after 3 wrong codes: HTTP 429 |

| TC-ID | SEC-016 |
|---|---|
| **Category** | Security |
| **Title** | Timing attack on password comparison |
| **Type** | Security |
| **Priority** | P1 |
| **Preconditions** | Admin login uses password comparison |
| **Steps** | 1. Measure response time for correct password<br>2. Measure response time for wrong password (first char correct)<br>3. Measure response time for wrong password (first char wrong)<br>4. Verify constant-time comparison (hmac.compare_digest or equivalent) |
| **Expected** | Response times statistically indistinguishable |
| **Assert** | Timing difference < 5ms across 1000 samples; no correlation between password correctness and response time |

| TC-ID | SEC-017 |
|---|---|
| **Category** | Security |
| **Title** | Large file upload bomb (1GB file) |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | File upload endpoint has size limits |
| **Steps** | 1. Attempt to upload 1GB file<br>2. Verify server rejects before reading entire file<br>3. Verify memory usage does not spike<br>4. Verify connection closed gracefully |
| **Expected** | 413 Payload Too Large; no OOM; graceful rejection |
| **Assert** | HTTP 413; server memory stable; no crash |

| TC-ID | SEC-018 |
|---|---|
| **Category** | Security |
| **Title** | Billion laughs / deeply nested JSON bomb in claim body |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | JSON parser configured with depth limits |
| **Steps** | 1. Send claim body with nested JSON 10,000 levels deep<br>2. Send XML entity expansion payload if XML accepted<br>3. Verify parser rejects with 400 |
| **Expected** | 400 Bad Request; no parser crash; no memory exhaustion |
| **Assert** | HTTP 400; server memory stable; response time < 100ms |

| TC-ID | SEC-019 |
|---|---|
| **Category** | Security |
| **Title** | Concurrent account lockout race (parallel 5 bad passwords) |
| **Type** | Security |
| **Priority** | P1 |
| **Preconditions** | Account lockout counter in Redis or DB |
| **Steps** | 1. Send 5 bad password attempts in parallel threads<br>2. Verify counter increments atomically<br>3. Verify lockout triggers correctly (no race condition bypass) |
| **Expected** | Account locked after 5 total attempts; no race bypass |
| **Assert** | After 5 parallel attempts, next login returns HTTP 429 |

| TC-ID | SEC-020 |
|---|---|
| **Category** | Security |
| **Title** | API key leakage in error responses |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Application returns error messages for 4xx/5xx |
| **Steps** | 1. Trigger 500 errors on multiple endpoints<br>2. Inspect response body for: API keys, DB connection strings, JWT secrets, internal paths<br>3. Inspect logs for same leaks |
| **Expected** | No secrets in response; no secrets in client-facing logs |
| **Assert** | Response body contains no matches for `password`, `secret`, `api_key`, `token` (except expected auth flows) |

---

## PART H: REAL PERFORMANCE / LOAD TESTS

### Test Cases

| TC-ID | PERF-001 |
|---|---|
| **Category** | Performance |
| **Title** | 500 VUs — mixed workload 30 minutes |
| **Type** | Performance |
| **Priority** | P0 |
| **Preconditions** | k6 installed; staging environment running; monitoring active |
| **Steps** | Run k6 script with: 30% login, 20% claim submission, 20% get claims, 15% satellite NDVI, 10% scoring, 5% admin. Duration: 30 minutes. 500 virtual users. |
| **Expected** | p95 latency < 500ms; error rate < 0.1%; no 5xx spikes |
| **Assert** | k6 output: `p95 < 500ms`, `error_rate < 0.001` |

| TC-ID | PERF-002 |
|---|---|
| **Category** | Performance |
| **Title** | 100 simultaneous fraud scoring requests |
| **Type** | Performance |
| **Priority** | P0 |
| **Preconditions** | Scoring endpoint available; Celery workers running |
| **Steps** | Submit 100 scoring requests concurrently with complete 47-feature vectors. |
| **Expected** | All complete within 10 seconds; p95 < 2000ms |
| **Assert** | k6 output: `max < 10000ms`, `p95 < 2000ms`, `failed == 0` |

| TC-ID | PERF-003 |
|---|---|
| **Category** | Performance |
| **Title** | 1000 concurrent file uploads (10MB each) |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | File storage (S3/MinIO) accessible; upload endpoint available |
| **Steps** | Upload 1000 files of 10MB simultaneously. |
| **Expected** | No 5xx; p95 < 8000ms; server memory stable |
| **Assert** | k6 output: `failed == 0`, `p95 < 8000ms`; server RSS memory delta < 500MB |

| TC-ID | PERF-004 |
|---|---|
| **Category** | Performance |
| **Title** | DB query performance at 1M records |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | DB seeded with 1M claims, 1M fraud_scores, 5M audit_logs |
| **Steps** | Run filtered queries on all large tables with EXPLAIN ANALYZE. |
| **Expected** | All queries < 100ms with indexes |
| **Assert** | `EXPLAIN` shows index scans; execution times < 100ms |

| TC-ID | PERF-005 |
|---|---|
| **Category** | Performance |
| **Title** | Redis cache hit ratio |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | Redis running; cache warmed up |
| **Steps** | Run 1000 requests for satellite and weather endpoints. 80% should be cache hits after warm-up. |
| **Expected** | Cache hit ratio > 80% |
| **Assert** | `redis-cli info stats` shows `keyspace_hits / (keyspace_hits + keyspace_misses) > 0.80` |

| TC-ID | PERF-006 |
|---|---|
| **Category** | Performance |
| **Title** | Kafka throughput |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | Kafka cluster running; consumers healthy |
| **Steps** | Produce 10,000 events/minute sustained for 10 minutes. Monitor consumer lag. |
| **Expected** | Consumer lag < 500 messages throughout |
| **Assert** | `kafka_consumer_lag` gauge < 500 for all consumer groups during test |

| TC-ID | PERF-007 |
|---|---|
| **Category** | Performance |
| **Title** | Scoring engine cold start |
| **Type** | Performance |
| **Priority** | P1 |
| **Preconditions** | Scoring service restarted; model not yet loaded in memory |
| **Steps** | 1. Restart scoring service<br>2. Send first scoring request<br>3. Send second scoring request |
| **Expected** | First request < 3 seconds; subsequent < 500ms |
| **Assert** | First request latency < 3000ms; second < 500ms |

| TC-ID | PERF-008 |
|---|---|
| **Category** | Performance |
| **Title** | API gateway rate limit under load |
| **Type** | Performance |
| **Priority** | P0 |
| **Preconditions** | Rate limiter configured at 60 req/min per IP |
| **Steps** | Send 1000 requests/minute from same IP. |
| **Expected** | Rate limiter triggers at 60/minute; 429s returned correctly; no 500s |
| **Assert** | Exactly 60 HTTP 200s per minute; remaining = 429; zero 500s |

---

## PART I: REAL INTEGRATION TESTS (EXTERNAL SERVICES)

### Test Cases

| TC-ID | INT-001 |
|---|---|
| **Category** | Integration |
| **Title** | GEE authentication with real service account |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | GEE service account JSON key available |
| **Steps** | 1. Initialize GEE with service account<br>2. List available image collections<br>3. Verify no authentication errors |
| **Expected** | GEE authenticated successfully; collections listed |
| **Assert** | `ee.Initialize()` succeeds; `ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").first().getInfo()` returns metadata |

| TC-ID | INT-002 |
|---|---|
| **Category** | Integration |
| **Title** | GEE image retrieval latency (real Sentinel-2) |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | GEE authenticated |
| **Steps** | Request single Sentinel-2 image for Akola coordinates. |
| **Expected** | Image metadata returned within 5 seconds |
| **Assert** | Response time < 5000ms; image metadata contains `system:time_start` |

| TC-ID | INT-003 |
|---|---|
| **Category** | Integration |
| **Title** | OpenWeatherMap / Open-Meteo real API call + response parsing |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | API key configured or free tier endpoint used |
| **Steps** | 1. Call Open-Meteo historical API for Haveri on 2024-08-20<br>2. Parse rainfall_mm from JSON response |
| **Expected** | Valid JSON; rainfall_mm is numeric; no parsing errors |
| **Assert** | HTTP 200; `daily.rainfall_sum[0]` is float >= 0 |

| TC-ID | INT-004 |
|---|---|
| **Category** | Integration |
| **Title** | Redis connection pool exhaustion behavior |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Redis max_connections set low for test (e.g., 10) |
| **Steps** | 1. Open 20 concurrent Redis connections<br>2. Verify pool queuing or error handling<br>3. Verify no application crashes |
| **Expected** | Pool handles overflow gracefully; requests queued or timed out cleanly |
| **Assert** | No unhandled exceptions; Redis timeout errors are caught and logged |

| TC-ID | INT-005 |
|---|---|
| **Category** | Integration |
| **Title** | PostgreSQL connection pool behavior under load |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | SQLAlchemy async pool configured; pool_size and max_overflow set |
| **Steps** | 1. Run 100 concurrent DB queries<br>2. Monitor pool usage<br>3. Verify no connection leaks |
| **Expected** | Pool utilization < max_overflow; connections returned to pool after use |
| **Assert** | `pg_stat_activity` shows no idle-in-transaction timeouts; no connection leaks |

| TC-ID | INT-006 |
|---|---|
| **Category** | Integration |
| **Title** | Kafka broker connection and topic creation |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Kafka broker address configured |
| **Steps** | 1. Connect producer to Kafka broker<br>2. Create test topic programmatically<br>3. Send test message<br>4. Consume test message |
| **Expected** | Connection successful; topic created; message round-trips |
| **Assert** | Producer `send()` returns RecordMetadata; consumer receives exact payload |

| TC-ID | INT-007 |
|---|---|
| **Category** | Integration |
| **Title** | Object storage (S3/MinIO) — real file upload + signed URL |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | MinIO or S3 bucket configured; credentials valid |
| **Steps** | 1. Upload 5MB test file to bucket<br>2. Generate presigned GET URL (15 min expiry)<br>3. Download via signed URL<br>4. Verify file integrity (SHA-256 match)<br>5. Wait 16 minutes; verify signed URL expired |
| **Expected** | Upload success; download via signed URL works before expiry; fails after expiry |
| **Assert** | Pre-expiry download: HTTP 200, SHA-256 match; Post-expiry: HTTP 403 |

| TC-ID | INT-008 |
|---|---|
| **Category** | Integration |
| **Title** | SMTP email delivery (real email for notifications) |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | SMTP server configured; Mailpit or real SMTP available |
| **Steps** | 1. Trigger claim approval notification<br>2. Verify email queued in Celery<br>3. Verify email sent via SMTP<br>4. Verify recipient receives email with correct subject and body |
| **Expected** | Email delivered; subject contains claim number; body has decision details |
| **Assert** | Mailpit/webhook shows email received; recipient inbox contains email |

| TC-ID | INT-009 |
|---|---|
| **Category** | Integration |
| **Title** | SMS OTP delivery (mock for CI, real in staging) |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | SMS gateway configured or mock SMS service enabled |
| **Steps** | 1. Request OTP for farmer mobile<br>2. In CI: verify mock SMS service logged the OTP<br>3. In staging: verify real SMS received on test number |
| **Expected** | OTP delivered (real or mock); 6-digit numeric code |
| **Assert** | Mock service log contains OTP; or SMS inbox contains message with OTP |

| TC-ID | INT-010 |
|---|---|
| **Category** | Integration |
| **Title** | C++ engine subprocess invocation timing |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | C++ binary compiled and executable |
| **Steps** | 1. Python backend spawns subprocess calling `fraud_engine.exe`<br>2. Pass JSON via stdin<br>3. Read JSON from stdout<br>4. Measure total invocation time |
| **Expected** | Subprocess completes within 200ms; valid JSON output; exit code 0 |
| **Assert** | `subprocess.run()` returns in < 200ms; `returncode == 0`; `json.loads(stdout)` succeeds |

---

## PART J: STATE ADAPTER REAL DATA TESTS

### Test Cases

| TC-ID | ADAPT-001 |
|---|---|
| **Category** | State Adapter |
| **Title** | Maharashtra cotton claim with Vidarbha coordinates |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Maharashtra adapter config loaded in DB |
| **Steps** | 1. Load Maharashtra adapter<br>2. Verify NDVI threshold = 0.20 applied<br>3. Verify minimum 3 photos enforced<br>4. Verify district committee approval step present |
| **Expected** | Adapter-specific rules applied; claim routed correctly |
| **Assert** | `adapter_id` = Maharashtra; `ndvi_threshold` = 0.20; workflow contains `district_committee_approval` |

| TC-ID | ADAPT-002 |
|---|---|
| **Category** | State Adapter |
| **Title** | Punjab wheat claim with Ludhiana coordinates |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Punjab adapter config loaded in DB |
| **Steps** | 1. Load Punjab adapter<br>2. Verify SAR data required for Rabi claims<br>3. Verify yield data integration expected |
| **Expected** | SAR requirement enforced; yield data check present |
| **Assert** | `sar_required = true` for Rabi claims; `yield_data_source` configured |

| TC-ID | ADAPT-003 |
|---|---|
| **Category** | State Adapter |
| **Title** | Telangana paddy claim with Rangareddy coordinates |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Telangana adapter config loaded in DB |
| **Steps** | 1. Load Telangana adapter<br>2. Verify Rythu Bandhu scheme cross-check<br>3. Verify village committee approval step |
| **Expected** | Rythu Bandhu integration active; village committee workflow present |
| **Assert** | `rythu_bandhu_check = true`; workflow step `vao_approval` exists |

| TC-ID | ADAPT-004 |
|---|---|
| **Category** | State Adapter |
| **Title** | Unknown state → default adapter loaded |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Claim submitted for state with no custom adapter |
| **Steps** | 1. Submit claim for state not in adapters table<br>2. Verify fallback behavior<br>3. Verify default thresholds apply<br>4. No crash or unhandled exception |
| **Expected** | Default adapter loaded; claim processed normally |
| **Assert** | `adapter_id` = "default"; HTTP 200; no stack trace in logs |

| TC-ID | ADAPT-005 |
|---|---|
| **Category** | State Adapter |
| **Title** | Adapter config hot-reload |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Admin panel accessible; Redis cache stores adapter config |
| **Steps** | 1. Admin updates Maharashtra NDVI threshold: 0.20 → 0.25<br>2. Redis cache invalidated<br>3. Next claim uses new threshold<br>4. Old claims not retroactively rescored |
| **Expected** | New threshold applied immediately; old scores unchanged |
| **Assert** | New claim: `ndvi_threshold = 0.25`; old fraud_score records: `ndvi_threshold = 0.20` |

---

## PART K: EVIDENCE AND PDF DOSSIER TESTS

### Test Cases

| TC-ID | EVID-001 |
|---|---|
| **Category** | Evidence / PDF |
| **Title** | Generate full evidence PDF dossier for approved claim |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Claim approved; evidence, inspection, scoring, and decision data complete |
| **Steps** | 1. Trigger PDF generation for claim<br>2. Download generated PDF<br>3. Verify all sections present |
| **Expected** | PDF pages >= 4; all sections present; farm GPS shown on map |
| **Assert** | PDF contains: farmer profile, policy summary, claim summary, inspection report, photos (max 10), NDVI chart, weather summary, fraud score + explanation, decision block, audit trail summary |

| TC-ID | EVID-002 |
|---|---|
| **Category** | Evidence / PDF |
| **Title** | PDF signed URL access control |
| **Type** | Security |
| **Priority** | P0 |
| **Preconditions** | Signed URL generated for dossier PDF; RBAC enforced |
| **Steps** | 1. Reviewer accesses signed URL → should succeed<br>2. Insurer accesses signed URL → should succeed<br>3. Admin accesses signed URL → should succeed<br>4. Farmer accesses signed URL → should fail (403)<br>5. Officer accesses signed URL → should fail (403)<br>6. Wait for expiry; access expired URL → should fail (403) |
| **Expected** | Reviewer/Insurer/Admin: 200; Farmer/Officer: 403; Expired: 403 |
| **Assert** | Role-based access returns correct status codes |

| TC-ID | EVID-003 |
|---|---|
| **Category** | Evidence / PDF |
| **Title** | File deduplication by hash |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | Evidence upload endpoint calculates SHA-256 |
| **Steps** | 1. Upload same photo twice<br>2. System detects matching SHA-256 hash<br>3. File not stored twice<br>4. Both upload calls return same file URL |
| **Expected** | Single storage object; duplicate uploads reference same URL |
| **Assert** | `SELECT COUNT(*) FROM evidence_items WHERE file_hash = X` = 1; both uploads return identical `storage_url` |

---

## PART L: OBSERVABILITY AND MONITORING TESTS

### Test Cases

| TC-ID | OBS-001 |
|---|---|
| **Category** | Observability |
| **Title** | Structured JSON logs emitted for every request |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Structured logging middleware active |
| **Steps** | 1. Send 10 API requests<br>2. Inspect application logs<br>3. Verify JSON format |
| **Expected** | Log includes: request_id, user_id, method, path, status, latency_ms; no sensitive data |
| **Assert** | Every request has `request_id`, `user_id`, `method`, `path`, `status`, `latency_ms`; no `password` or `token` in log fields |

| TC-ID | OBS-002 |
|---|---|
| **Category** | Observability |
| **Title** | Prometheus metrics endpoint active |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Prometheus client library integrated; `/metrics` endpoint exposed |
| **Steps** | 1. GET /metrics<br>2. Verify request_count, latency_histogram, error_rate present<br>3. Verify fraud_score_distribution gauge present<br>4. Verify kafka_consumer_lag gauge present |
| **Expected** | All expected metrics exported in Prometheus text format |
| **Assert** | Response body contains `request_count_total`, `latency_histogram_bucket`, `error_rate`, `fraud_score_distribution`, `kafka_consumer_lag` |

| TC-ID | OBS-003 |
|---|---|
| **Category** | Observability |
| **Title** | Health check endpoint |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Health check endpoints registered in FastAPI |
| **Steps** | 1. GET /api/v1/health/live → should return 200 always (liveness)<br>2. GET /api/v1/health/ready → should return 200 when DB + Redis + Kafka all up<br>3. Stop Redis; GET /api/v1/health/ready → should return 503 |
| **Expected** | Liveness always 200; Readiness 200 when healthy, 503 when dependency down |
| **Assert** | `/health/live` = 200; `/health/ready` = 200 (healthy) or 503 (Redis down) |

| TC-ID | OBS-004 |
|---|---|
| **Category** | Observability |
| **Title** | Distributed tracing |
| **Type** | Integration |
| **Priority** | P1 |
| **Preconditions** | OpenTelemetry or similar tracing middleware active; Jaeger/Zipkin collector running |
| **Steps** | 1. Send API request with `X-Request-ID: test-trace-001`<br>2. Verify trace spans for: API → service → DB → external API<br>3. Verify trace visible in tracing tool |
| **Expected** | Trace spans cover all layers; trace ID propagated |
| **Assert** | Jaeger/Zipkin UI shows `test-trace-001` with spans for API, DB, GEE, scoring service |

| TC-ID | OBS-005 |
|---|---|
| **Category** | Observability |
| **Title** | Alert firing |
| **Type** | Integration |
| **Priority** | P0 |
| **Preconditions** | Alertmanager or similar configured; alert rules defined |
| **Steps** | 1. Simulate scoring latency p95 > 5 seconds for 2 minutes<br>2. Verify alert fires<br>3. Simulate DLQ message count > 10<br>4. Verify alert fires<br>5. Simulate error rate > 1% for 1 minute<br>6. Verify alert fires<br>7. Simulate DB connection pool > 80% utilized<br>8. Verify alert fires |
| **Expected** | All 4 alerts fire within defined thresholds |
| **Assert** | Alertmanager shows 4 active alerts with correct labels; alert notifications dispatched (webhook/email) |

---

# DELIVERABLES

## 1. Test Execution Order for CI/CD Pipeline

| Phase | Trigger | Duration | Tests | Environment |
|---|---|---|---|---|
| **Phase 1: Smoke** | Every commit | < 5 min | SAT-007 (GEE fallback), WEA-005 (weather fallback), FRAUD-005 (Python fallback), KAFKA-005 (broker recovery), DB-001 (atomicity), OBS-003 (health) | Docker Compose local |
| **Phase 2: Critical Path** | Every PR | < 15 min | All P0 from: Part A (SAT-001, SAT-007), Part B (WEA-001, WEA-005), Part C (FRAUD-001, FRAUD-002, FRAUD-004, FRAUD-006, FRAUD-010), Part D (DB-001, DB-002, DB-005, DB-006, DB-007), Part E (KAFKA-001, KAFKA-002, KAFKA-003, KAFKA-005, KAFKA-006), Part G (SEC-001, SEC-002, SEC-004, SEC-010, SEC-011, SEC-017, SEC-018), Part H (PERF-001 smoke run 2 min), Part I (INT-001, INT-003, INT-006, INT-007), Part J (ADAPT-001, ADAPT-004), Part K (EVID-001, EVID-002), Part L (OBS-001, OBS-002, OBS-003, OBS-005) | Staging |
| **Phase 3: Full Regression** | Nightly | < 60 min | All P0 + P1 test cases | Staging |
| **Phase 4: Extended** | Weekly | < 120 min | All P2 cases, full Performance suite (30 min runs), Security penetration tests (OWASP ZAP + manual), ML offline evaluation (ML-002), Real satellite batch (SAT-009) | Production-like |

---

## 2. Which Tests Need Real External Credentials

| Test IDs | External Service | Credential Type | Storage |
|---|---|---|---|
| SAT-001 to SAT-005, SAT-007, SAT-010 | Google Earth Engine | Service account JSON key | `secrets/gee-service-account.json` (mount as file, not in repo) |
| WEA-001 to WEA-004, WEA-006 to WEA-008 | Open-Meteo / IMD / OpenWeatherMap | API key (free tier often keyless) | Env var: `OPENMETEO_API_KEY` |
| INT-001, INT-002 | GEE Python SDK | Same as SAT | Same as SAT |
| INT-003 | Open-Meteo | Same as WEA | Same as WEA |
| INT-007 | S3 / MinIO | Access key + secret | Env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` or `MINIO_ROOT_USER/PASSWORD` |
| INT-008 | SMTP / Mailpit | SMTP credentials | Env vars: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| INT-009 | SMS Gateway | API key | Env var: `SMS_API_KEY` |
| ML-001, ML-002, ML-003, ML-006 | ML Model Registry | S3/MinIO model artifacts | Same as INT-007 |
| PERF-001, PERF-003, PERF-006 | All above | All above | All above |

---

## 3. Which Tests Can Run Fully Offline with Mocks

| Test IDs | Mock Strategy | Mock Tool |
|---|---|---|
| SAT-006, SAT-007, SAT-008 | Mock GEE response with pre-captured NDVI JSON | `responses` library / `pytest-httpx` |
| WEA-004, WEA-005 | Mock weather API with static JSON fixtures | `responses` / `respx` |
| FRAUD-001, FRAUD-002, FRAUD-003, FRAUD-007, FRAUD-008, FRAUD-009, FRAUD-010 | Use Python rule-based scorer; mock C++ binary | `unittest.mock` / `monkeypatch` |
| DB-001 to DB-010 | Use SQLite or Testcontainers PostgreSQL | `pytest-asyncio` + `testcontainers` |
| KAFKA-002, KAFKA-003, KAFKA-007 | Use embedded Kafka or `kafka-python` mock | `testcontainers.kafka` |
| SEC-001 to SEC-020 | No external deps; run against local API | Local FastAPI test client (`TestClient`) |
| OBS-001 to OBS-005 | Mock alertmanager / tracing collector | `unittest.mock` |
| ADAPT-004, ADAPT-005 | Mock Redis cache; use in-memory adapter config | `fakeredis` |
| EVID-001 to EVID-003 | Mock MinIO with `moto` or local filesystem storage | `moto[s3]` / temp dir |
| INT-004, INT-005, INT-010 | Mock Redis / DB pool; mock subprocess | `fakeredis` / `unittest.mock` |

---

## 4. pytest File Structure for Backend

```
bhuvigyan-backend/tests/
├── conftest.py                          # pytest fixtures: async event loop, DB engine, test client
├── unit/
│   ├── test_feature_assembler.py        # FRAUD-003: 47 feature unit tests
│   ├── test_scoring_service.py          # FRAUD-001, FRAUD-002: score computation
│   ├── test_state_adapter.py            # ADAPT-004, ADAPT-005: adapter logic
│   ├── test_weather_service.py          # WEA-004, WEA-005: weather parsing & fallback
│   └── test_notification_service.py     # OBS-001: notification formatting
├── integration/
│   ├── test_satellite.py                # SAT-001 to SAT-011
│   ├── test_weather.py                  # WEA-001 to WEA-008
│   ├── test_scoring_pipeline.py         # FRAUD-004 to FRAUD-010
│   ├── test_claim_flow.py               # DB-001 to DB-003, DB-006 to DB-007
│   ├── test_database_perf.py            # DB-004, DB-009, DB-010
│   ├── test_kafka_pipeline.py           # KAFKA-001 to KAFKA-007
│   ├── test_ml_model.py                 # ML-001 to ML-007
│   ├── test_security.py                 # SEC-001 to SEC-020
│   ├── test_state_adapters.py           # ADAPT-001 to ADAPT-003
│   ├── test_evidence_dossier.py         # EVID-001 to EVID-003
│   ├── test_observability.py            # OBS-001 to OBS-005
│   └── test_external_services.py        # INT-001 to INT-010
├── e2e/
│   └── test_full_claim_lifecycle.py     # End-to-end: farmer → claim → inspection → scoring → review → decision → notification → PDF
└── fixtures/
    ├── gee/
    │   └── ndvi_akola_2024.json
    ├── weather/
    │   └── haveri_2024_08_20.json
    ├── claims/
    │   ├── genuine_low_risk.json
    │   └── high_fraud.json
    └── photos/
        └── test_photo_1.jpg
```

---

## 5. Playwright File Structure for Frontend

```
frontend/bhuvigyan-ui/e2e/
├── playwright.config.ts
├── auth.setup.ts                          # Shared auth state for all roles
├── fixtures/
│   └── test-claims.ts
├── tests/
│   ├── auth/
│   │   ├── farmer-login.spec.ts
│   │   ├── admin-login.spec.ts
│   │   └── otp-validation.spec.ts
│   ├── farmer/
│   │   ├── create-claim.spec.ts
│   │   ├── view-claims.spec.ts
│   │   └── notifications.spec.ts
│   ├── state/
│   │   ├── claim-queue.spec.ts
│   │   └── claim-review.spec.ts
│   ├── admin/
│   │   ├── user-management.spec.ts
│   │   └── config-management.spec.ts
│   ├── evidence/
│   │   └── upload-evidence.spec.ts
│   └── security/
│       ├── xss-protection.spec.ts
│       └── idor-prevention.spec.ts
└── pages/
    ├── LoginPage.ts
    ├── FarmerDashboardPage.ts
    ├── ClaimQueuePage.ts
    └── ClaimReviewPage.ts
```

---

## 6. k6 Scripts

### PERF-001: 500 VUs Mixed Workload

```javascript
// tests/perf/mixed-workload.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '20m', target: 500 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

function login() {
  const res = http.post(`${BASE_URL}/api/v1/farmer/login`, JSON.stringify({ mobile: '9900000001' }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login status 200': (r) => r.status === 200 });
}

function submitClaim(token) {
  const payload = {
    policyId: 'policy-1',
    lossType: 'DROUGHT',
    lossDate: '2024-08-15',
    affectedArea: 2.5,
    claimAmount: 45000,
    description: 'Drought damage observed across insured plot. Crop completely dried.',
  };
  const res = http.post(`${BASE_URL}/api/v1/farmer/claims`, JSON.stringify(payload), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
  check(res, { 'claim submit 201': (r) => r.status === 201 });
}

function getClaims(token) {
  const res = http.get(`${BASE_URL}/api/v1/farmer/claims`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'get claims 200': (r) => r.status === 200 });
}

function getNdvi() {
  const res = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  check(res, { 'ndvi 200': (r) => r.status === 200 });
}

function getScore() {
  const res = http.get(`${BASE_URL}/api/v1/scoring/health`);
  check(res, { 'scoring health 200': (r) => r.status === 200 });
}

function adminAction(token) {
  const res = http.get(`${BASE_URL}/api/v1/admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'admin 200': (r) => r.status === 200 });
}

export default function () {
  const rand = Math.random();
  if (rand < 0.30) login();
  else if (rand < 0.50) submitClaim('test-token');
  else if (rand < 0.70) getClaims('test-token');
  else if (rand < 0.85) getNdvi();
  else if (rand < 0.95) getScore();
  else adminAction('test-token');
  sleep(1);
}
```

### PERF-002: 100 Simultaneous Fraud Scoring Requests

```javascript
// tests/perf/scoring-burst.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    scoring_burst: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['max<10000', 'p(95)<2000'],
    http_req_failed: ['rate==0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const FEATURE_VECTOR = {
  claim_amount: 45000,
  sum_insured: 50000,
  loss_percentage: 60.0,
  officer_loss_pct: 58.0,
  ndvi_before: 0.62,
  ndvi_after: 0.28,
  historical_claims: 1,
  geo_cluster_claims: 1,
  weather_correlated: true,
  photo_count: 4,
  gps_verified: true,
  crop_season_match: true,
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/v1/scoring/compute`,
    JSON.stringify(FEATURE_VECTOR),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'status is 200': (r) => r.status === 200,
    'score present': (r) => r.json('data.score') !== undefined,
    'risk_level present': (r) => r.json('data.risk_level') !== undefined,
  });
}
```

### PERF-005: Redis Cache Hit Ratio

```javascript
// tests/perf/redis-cache.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Warm-up
    { duration: '2m', target: 100 },   // Steady state
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'],   // Cache hits should be < 50ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Warm-up call (may be cache miss)
  const res1 = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  check(res1, { 'ndvi status 200': (r) => r.status === 200 });

  // Repeated call (should be cache hit)
  const start = Date.now();
  const res2 = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  const duration = Date.now() - start;

  check(res2, {
    'cache hit status 200': (r) => r.status === 200,
    'cache hit fast': () => duration < 100,
  });
  sleep(0.5);
}
```

---

## 7. Docker Compose for Full Local Test Environment

```yaml
# docker-compose.test.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: bhuvigyan-test-db
    environment:
      POSTGRES_DB: bhuvigyan_test
      POSTGRES_USER: bhuvigyan
      POSTGRES_PASSWORD: bhuvigyan123
    ports:
      - "5432:5432"
    volumes:
      - pg_test_data:/var/lib/postgresql/data
      - ./infra/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bhuvigyan -d bhuvigyan_test"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: bhuvigyan-test-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.6.0
    container_name: bhuvigyan-test-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 10s
      retries: 5

  zookeeper:
    image: confluentinc/cp-zookeeper:7.6.0
    container_name: bhuvigyan-test-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  minio:
    image: minio/minio:latest
    container_name: bhuvigyan-test-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    command: server /data --console-address ":9001"
    volumes:
      - minio_test_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5

  mailpit:
    image: axllent/mailpit:latest
    container_name: bhuvigyan-test-mailpit
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
    environment:
      MP_UI_AUTH: "none"

  mock-gee:
    image: mockserver/mockserver:latest
    container_name: bhuvigyan-test-mock-gee
    ports:
      - "1080:1080"
    environment:
      MOCKSERVER_INITIALIZATION_JSON_PATH: /config/mock-gee.json
    volumes:
      - ./tests/fixtures/mock-gee.json:/config/mock-gee.json:ro

  backend:
    build:
      context: ./bhuvigyan-backend
      dockerfile: Dockerfile.test
    container_name: bhuvigyan-test-backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql+asyncpg://bhuvigyan:bhuvigyan123@postgres:5432/bhuvigyan_test
      REDIS_URL: redis://redis:6379/0
      KAFKA_BROKER: kafka:9092
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin123
      SMTP_HOST: mailpit
      SMTP_PORT: 1025
      GEE_ENABLED: "false"
      WEATHER_API_ENABLED: "false"
      ENV: test
    ports:
      - "8000:8000"
    volumes:
      - ./bhuvigyan-backend:/app:ro
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

volumes:
  pg_test_data:
  minio_test_data:
```

---

## 8. CI/CD Pipeline YAML (GitHub Actions)

```yaml
# .github/workflows/ci-test.yml
name: Bhuvigyan V7 — Full Test Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM UTC

env:
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"
  DATABASE_URL: postgresql+asyncpg://bhuvigyan:bhuvigyan123@localhost:5432/bhuvigyan_test
  REDIS_URL: redis://localhost:6379/0
  KAFKA_BROKER: localhost:9092

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ env.PYTHON_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }} }
      - name: Install Python deps
        run: pip install ruff black mypy
      - name: Lint backend
        run: cd bhuvigyan-backend && ruff check . && black --check .
      - name: Typecheck backend
        run: cd bhuvigyan-backend && mypy app/
      - name: Lint frontend
        run: cd frontend/bhuvigyan-ui && npm ci && npm run lint
      - name: Typecheck frontend
        run: cd frontend/bhuvigyan-ui && npx tsc --noEmit

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ env.PYTHON_VERSION }} }
      - name: Install deps
        run: cd bhuvigyan-backend && pip install -r requirements.txt && pip install -r requirements-test.txt
      - name: Run unit tests
        run: cd bhuvigyan-backend && pytest tests/unit/ -v --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          name: playwright-report
          path: ./bhuvigyan-backend/coverage.xml

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: bhuvigyan_test
          POSTGRES_USER: bhuvigyan
          POSTGRES_PASSWORD: bhuvigyan123
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      kafka:
        image: confluentinc/cp-kafka:7.6.0
        ports: ["9092:9092"]
        env:
          KAFKA_BROKER_ID: 1
          KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
          KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
          KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      zookeeper:
        image: confluentinc/cp-zookeeper:7.6.0
        env:
          ZOOKEEPER_CLIENT_PORT: 2181
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ env.PYTHON_VERSION }} }
      - name: Install deps
        run: cd bhuvigyan-backend && pip install -r requirements.txt && pip install -r requirements-test.txt
      - name: Run migrations
        run: cd bhuvigyan-backend && alembic upgrade head
      - name: Run integration tests
        run: cd bhuvigyan-backend && pytest tests/integration/ -v -m "not external"
      - name: Run database tests
        run: cd bhuvigyan-backend && pytest tests/integration/test_database*.py -v
      - name: Run Kafka tests
        run: cd bhuvigyan-backend && pytest tests/integration/test_kafka*.py -v

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ env.NODE_VERSION }} }
      - name: Install frontend deps
        run: cd frontend/bhuvigyan-ui && npm ci
      - name: Install Playwright
        run: cd frontend/bhuvigyan-ui && npx playwright install --with-deps
      - name: Start backend (Docker Compose)
        run: docker compose -f docker-compose.test.yml up -d --wait
      - name: Run E2E tests
        run: cd frontend/bhuvigyan-ui && npx playwright test
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/bhuvigyan-ui/playwright-report/
      - name: Stop services
        run: docker compose -f docker-compose.test.yml down -v

  security-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'schedule' || contains(github.ref, 'release')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ env.PYTHON_VERSION }} }
      - name: Install deps
        run: cd bhuvigyan-backend && pip install -r requirements.txt && pip install -r requirements-test.txt
      - name: Start backend
        run: cd bhuvigyan-backend && uvicorn main:app --host 0.0.0.0 --port 8000 &
      - name: Run security tests
        run: cd bhuvigyan-backend && pytest tests/integration/test_security.py -v
      - name: Run OWASP ZAP baseline scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:8000'
          rules_file_name: '.zap/rules.tsv'

  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - name: Start services
        run: docker compose -f docker-compose.test.yml up -d --wait
      - name: Run k6 mixed workload (2 min smoke)
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/perf/mixed-workload.js
          flags: --env BASE_URL=http://localhost:8000 --duration 2m
      - name: Run k6 scoring burst
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/perf/scoring-burst.js
          flags: --env BASE_URL=http://localhost:8000
      - name: Run k6 cache hit test
        uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/perf/redis-cache.js
          flags: --env BASE_URL=http://localhost:8000
      - name: Stop services
        run: docker compose -f docker-compose.test.yml down -v

  ml-evaluation:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: ${{ env.PYTHON_VERSION }} }
      - name: Install deps
        run: cd bhuvigyan-backend && pip install -r requirements.txt
      - name: Download model artifact
        run: |
          aws s3 cp s3://bhuvigyan-models/v7/champion/model.pkl ./bhuvigyan-backend/models/champion.pkl
          aws s3 cp s3://bhuvigyan-models/v7/challenger/model.pkl ./bhuvigyan-backend/models/challenger.pkl
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Run ML offline evaluation
        run: cd bhuvigyan-backend && pytest tests/integration/test_ml_model.py::test_model_offline_evaluation -v
      - name: Run fairness check
        run: cd bhuvigyan-backend && pytest tests/integration/test_ml_model.py::test_fairness_check -v
```

---

## DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
|---|---|---|---|
| 7.0.0 | 2026-05-10 | QA Architecture Team | Initial complete real-data full system test specification |
