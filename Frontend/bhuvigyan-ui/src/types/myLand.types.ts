export interface AdminInfo {
  village: string;
  taluk: string;
  district: string;
  state: string;
  source: string;
}

export interface SatelliteData {
  ndvi_mean: number | null;
  ndvi_min: number | null;
  ndvi_max: number | null;
  ndwi_mean: number | null;
  sar_vv_mean: number | null;
  scene_date: string | null;
  cloud_cover_pct: number | null;
  source: string;
  tile_url?: string;
  ndvi_tile_url?: string;
  reason?: string;
}

export interface CropAnalysis {
  detected_season: string;
  vegetation_status: string;
  crop_confidence: string;
  mixed_crop_flag: boolean;
  irrigation_status: string;
  fraud_risk_baseline: string;
  fraud_risk_reason: string;
  estimated_crop_type?: string;
  crop_coverage_pct?: number;
}

export interface DataFreshness {
  latest_scene_age_days: number;
  analysis_timestamp: string;
}

export interface LandAnalyzeResponse {
  coordinates: { lat: number; lon: number };
  admin: AdminInfo;
  satellite: SatelliteData;
  crop_analysis: CropAnalysis;
  data_freshness: DataFreshness;
}

export interface LandHolding {
  id: string;
  label: string;
  state: string;
  district: string;
  taluk: string;
  village: string;
  survey_number: string;
  land_area_acres: number | null;
  land_area_hectares: number | null;
  latitude: number | null;
  longitude: number | null;
  declared_crop: string | null;
  season: string | null;
  sowing_date: string | null;
  has_multiple_crops: boolean;
  secondary_crop: string | null;
  verification_status: string;
  verification?: any;
}

export interface NdviHistoryPoint {
  date: string;
  ndvi: number;
  label?: string;
}

export interface NdwHistoryPoint {
  date: string;
  ndwi: number;
}

export interface AnomalyItem {
  severity: 'HIGH' | 'MED' | 'LOW';
  description: string;
  explanation: string;
}
