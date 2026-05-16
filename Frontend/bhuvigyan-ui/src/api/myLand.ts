import api from './axios';

export interface VillageGeocodeResult {
  found: boolean;
  villages?: Array<{
    vid: string;
    village_name: string;
    district: string;
    taluk: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
    census?: {
      households: string | null;
      total_population: string | null;
      male_population: string | null;
      female_population: string | null;
      sc_population: string | null;
      st_population: string | null;
      male_literate: string | null;
      female_literate: string | null;
    };
  }>;
  error?: string;
  cached?: boolean;
}

export interface CoordinateVerifyResult {
  verified: boolean;
  match: boolean;
  village_match: boolean;
  district_match: boolean;
  geocoded_village?: string;
  geocoded_district?: string;
  reason: string;
}

export interface LandHolding {
  id: string;
  farmer_id: string;
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
  boundary_geojson: Record<string, unknown> | null;
  declared_crop: string | null;
  season: string | null;
  sowing_date: string | null;
  has_multiple_crops: boolean;
  secondary_crop: string | null;
  secondary_area_pct: number | null;
  bhuvan_vid: string | null;
  location_verified: boolean | null;
  location_mismatch_reason: string | null;
  satellite_verified: boolean;
  verification_status: string;
  created_at: string;
  verification?: SatelliteVerification;
}

export interface CropInfo {
  name: string;
  percentage: number;
  zone: string;
  ndvi_range: string;
}

export interface CropMixResult {
  crops: CropInfo[];
  primary_crop: CropInfo | null;
  secondary_crop: CropInfo | null;
  boundary_vegetation: CropInfo | null;
  intercropping: boolean;
  confidence: number;
  flag: string | null;
}

export interface NDVIZone {
  zone_id: string;
  ndvi_mean: number;
  label: string;
  health_badge: string;
  pixel_count: number;
  area_pct: number;
}

export interface Anomaly {
  date: string;
  type: string;
  severity: string;
  description: string;
  drop_magnitude?: number;
}

export interface ZoneLine {
  zone: string;
  color: string;
  data: Array<{ date: string; ndvi: number }>;
}

export interface SatelliteVerification {
  land_holding_id: string;
  label: string;
  survey_number: string;
  village: string;
  district: string;
  state: string;
  area_verified_ha: number | null;
  area_declared_ha: number | null;
  area_match_status: string | null;
  crop_mix: CropMixResult | null;
  ndvi_status: string;
  ndvi_mean: number | null;
  soil_moisture: string;
  moisture_data: Record<string, unknown>;
  last_satellite_date: string | null;
  zones: NDVIZone[];
  ndvi_timeseries: Array<{
    date: string;
    ndvi_mean: number;
    ndvi_std: number;
    ndvi_min: number;
    ndvi_max: number;
    label: string;
  }>;
  zone_lines: ZoneLine[];
  anomalies: Anomaly[];
  historical_baseline: Record<string, unknown>;
  tile_urls: { ndvi?: string; rgb?: string };
  source: string | null;
  used_radar_fallback: boolean;
  pipeline_steps: Array<{ step: string; status: string; message?: string }>;
  truth_packet: Record<string, unknown>;
  verification_status: string;
}

export const myLandApi = {
  villageGeocode: (village: string) =>
    api.post<{ success: boolean; data: VillageGeocodeResult }>('/my-land/village-geocode', { village }),

  verifyCoordinates: (lat: number, lng: number, declaredVillage: string, declaredDistrict: string) =>
    api.post<{ success: boolean; data: CoordinateVerifyResult }>('/my-land/verify-coordinates', {
      latitude: lat, longitude: lng, declared_village: declaredVillage, declared_district: declaredDistrict
    }),

  addLandHolding: (data: {
    farmer_id: string;
    state: string;
    district: string;
    taluk: string;
    village: string;
    survey_number: string;
    land_area_acres?: number;
    land_area_hectares?: number;
    latitude?: number;
    longitude?: number;
    boundary_geojson?: Record<string, unknown>;
    declared_crop?: string;
    season?: string;
    sowing_date?: string;
    has_multiple_crops?: boolean;
    secondary_crop?: string;
    secondary_area_pct?: number;
  }) => api.post<{ success: boolean; data: { id: string; label: string; verification_status: string } }>('/my-land/add-land-holding', data),

  getLandHoldings: (farmerId: string) =>
    api.get<{ success: boolean; data: LandHolding[]; count: number }>(`/my-land/land-holdings/${farmerId}`),

  getLandHolding: (holdingId: string) =>
    api.get<{ success: boolean; data: LandHolding }>(`/my-land/land-holding/${holdingId}`),

  verifyLand: (holdingId: string, farmerId: string) =>
    api.post<{ success: boolean; data: SatelliteVerification }>('/my-land/verify-land', {
      land_holding_id: holdingId, farmer_id: farmerId
    }),

  getTruthPacket: (holdingId: string) =>
    api.get<{ success: boolean; data: { text: string; json: Record<string, unknown> } }>(`/my-land/truth-packet/${holdingId}`),

  deleteLandHolding: (holdingId: string) =>
    api.delete<{ success: boolean; message: string }>(`/my-land/land-holding/${holdingId}`),
};
