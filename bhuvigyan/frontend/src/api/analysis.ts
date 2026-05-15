import { apiClient } from './client'

export interface AnalysisInput {
  district: string
  taluk: string
  hobli: string
  village: string
  survey_number: string
  hissa_number?: string
  kgis_village_id?: string
  kgis_village_code?: string
  lat?: number | null
  lng?: number | null
  declared_crop?: string
  claimed_area_ha?: number | null
}

export interface AnalysisResult {
  success: boolean
  cached?: boolean
  source?: string
  data?: {
    land_record?: {
      owner_name?: string
      all_owners?: string[]
      survey_number?: string
      hissa_number?: string
      area_hectares?: number
      area_acres?: number
      land_type?: string
      surnoc?: string
      period?: string
      source?: string
      message?: string
    }
    polygon?: {
      found: boolean
      survey_number?: string
      kgis_village_id?: string
      geojson?: any
      leaflet_coords?: number[][]
      centroid_lat?: number
      centroid_lng?: number
      area_ha_computed?: number
      polygon_count?: number
      valid?: boolean
      issues?: string[]
      source?: string
    }
    admin?: {
      district?: string
      district_code?: string
      taluk?: string
      taluk_code?: string
      hobli?: string
      hobli_code?: string
      village?: string
      village_code?: string
      kgis_village_id?: string
      found?: boolean
    }
    ndvi?: {
      mean?: number
      health_label?: string
      interpretation?: string
      scan_date?: string
      cloud_cover_pct?: number
      source?: string
      timeseries?: Array<{
        date: string
        ndvi: number
        label: string
        is_anomaly?: boolean
      }>
      anomaly_count?: number
      error?: string
    }
    fraud?: {
      fraud_score: number
      band: string
      verdict: string
      recommendation: string
      factors: Array<{
        factor: string
        severity: string
        weight: number
        detail: string
      }>
    }
    service_status?: Record<string, {
      status: string
      source: string
      message: string
    }>
  }
  error?: {
    message: string
    code?: string
  }
}

export async function runAnalysis(payload: AnalysisInput): Promise<AnalysisResult> {
  const res = await apiClient.post('/analysis/', payload)
  return res.data as AnalysisResult
}
