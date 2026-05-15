import { apiClient } from './client'

export interface PolygonData {
  found: boolean
  error?: string
  centroid_lat?: number
  centroid_lng?: number
  area_ha?: number
  area_acres?: number
  area_sqm?: number
  bounds?: {
    min_lng: number
    min_lat: number
    max_lng: number
    max_lat: number
  }
  leaflet_polygons?: number[][][]
  geojson_feature?: any
  parcel_count?: number
  is_valid?: boolean
  validation?: {
    valid: boolean
    issues: string[]
    in_karnataka: boolean
    area_ha?: number
  }
  survey_number?: string
  kgis_village_id?: string
  cached?: boolean
}

export interface NDVIData {
  ndvi?: {
    mean: number
    std_dev: number
    min: number
    max: number
    label: string
    health_pct: number
  }
  ndwi?: {
    mean: number
    label: string
  }
  imagery?: {
    scan_date: string
    cloud_cover_pct: number
    image_count: number
    source: string
    ndvi_tile_url?: string
    rgb_tile_url?: string
  }
  period?: string
  cached?: boolean
  error?: string
}

export interface FraudData {
  fraud_score: number
  band: 'CLEAN' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK'
  recommendation: string
  factors: Array<{
    factor: string
    weight: number
    detail: string
    severity: string
    anomaly_dates?: string[]
  }>
  factor_count?: number
  ndvi_mean?: number
  ndwi_mean?: number
  anomaly_count?: number
  actual_area_ha?: number
}

export interface AnalysisResult {
  polygon?: PolygonData
  ndvi?: NDVIData
  timeseries?: {
    timeseries: Array<{ date: string; ndvi: number; label: string }>
    anomalies: Array<{ date: string; type: string; severity: string; description: string }>
    count: number
  }
  fraud?: FraudData
}

export async function fetchSurveyPolygon(
  kgis_village_id: string,
  survey_number: string,
  coord_type: string = 'DD'
): Promise<PolygonData> {
  const { data } = await apiClient.get('/land/survey-polygon', {
    params: { kgis_village_id, survey_number, coord_type }
  })
  return data
}

export async function fetchAdminHierarchy(
  village_code: string,
  code_type: string = 'lgd'
) {
  const { data } = await apiClient.get('/land/admin-hierarchy', {
    params: { village_code, code_type }
  })
  return data
}

export async function fetchSurveyNumbers(
  village_code: string,
  lat: number,
  lng: number,
  distance: number = 500
) {
  const { data } = await apiClient.get('/land/survey-numbers', {
    params: { village_code, lat, lng, distance }
  })
  return data
}
