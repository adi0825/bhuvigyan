import api from './axios';

export interface SatelliteData {
  farmer_id?: string;
  farmer_name?: string;
  ulpin?: string;
  survey_number?: string;
  village?: string;
  taluk?: string;
  district?: string;
  state?: string;
  land_area_ha?: number;
  farm_lat?: number;
  farm_lng?: number;
  kgis_verified?: boolean;
  satellite_analysis?: {
    ndvi: {
      ndvi: number;
      health_label: string;
      scan_date: string;
      cloud_cover_pct: number;
      source: string;
    };
    ndwi?: {
      ndwi: number;
      label: string;
      moisture_status: string;
      scan_date: string;
    };
    sar_flood?: {
      flood_detected?: boolean;
      confidence?: number;
      scan_date?: string;
      source?: string;
      flood_area_ha?: number;
    };
    fire_alerts?: {
      fire_detected: boolean;
      hotspot_count: number;
      closest_distance_km: number;
      source: string;
      scan_date: string;
    };
    fire?: {
      detected: boolean;
      hotspot_count: number;
      closest_distance_km: number;
      source: string;
      scan_date: string;
    };
    satellite_tile: {
      tile_url: string;
      source: string;
      scan_date: string;
      attribution: string;
    };
    ndvi_tile: {
      tile_url: string;
      source: string;
      scan_date: string;
      attribution: string;
    };
    thumbnail_b64?: string;
    computed_at: string;
  };
  ndvi?: {
    ndvi: number;
    health_label: string;
    scan_date: string;
    cloud_cover_pct: number;
    source: string;
  };
  ndwi?: {
    ndwi: number;
    label: string;
    moisture_status: string;
    scan_date: string;
  };
  sar_flood?: {
    flood_detected?: boolean;
    confidence?: number;
    scan_date?: string;
    source?: string;
    flood_area_ha?: number;
  };
  fire?: {
    detected?: boolean;
    hotspot_count?: number;
    closest_distance_km?: number;
    source?: string;
    scan_date?: string;
  };
  satellite_tile?: {
    tile_url: string;
    source: string;
    scan_date: string;
    attribution: string;
  };
  ndvi_tile?: {
    tile_url: string;
    source: string;
    scan_date: string;
    attribution: string;
  };
  thumbnail_b64?: string;
  computed_at?: string;
  cached?: boolean;
  cropType?: string;
  secondaryCrop?: string;
  mixedCropFlag?: boolean;
  cropConfidence?: number;
  floodRisk?: {
    flood_detected: boolean;
    confidence: number;
    risk_level: string;
    reason?: string;
    raw_sar_detected?: boolean;
    raw_sar_confidence?: number;
  };
  analysisConfidence?: number;
  manualReviewRequired?: boolean;
  qualityWarnings?: string[];
  crop_display?: {
    primary: string;
    secondary: string | null;
    mixed: boolean;
    confidence: number;
    label: string;
    review_needed: boolean;
  };
  flood_display?: {
    label: string;
    risk_level: string;
    confidence: number;
    reason: string;
  };
}

export interface TimeseriesPoint {
  month?: string;
  date?: string;
  ndvi: number;
  label: string;
  image_count?: number;
}

export interface TileUrls {
  rgb_tile: string;
  ndvi_tile: string;
  center: { lat: number; lng: number };
  zoom: number;
}

export interface ThumbnailResponse {
  thumbnail_b64: string;
  center: { lat: number; lng: number };
  radius_m: number;
  source: string;
  has_image: boolean;
}

export interface RegionAnalysis {
  state: string;
  district: string;
  start_date: string;
  end_date: string;
  avg_ndvi: number;
  mean_ndvi: number;
  mean_ndwi: number;
  health_label: string;
  stress_area_ha: number;
  farm_count: number;
  stress_zones: Array<{
    lat: number;
    lng: number;
    ndvi: number;
    udlrn: string;
    label: string;
  }>;
  ndvi_tile_url: string;
  rgb_tile_url: string;
  timeseries: Array<{ date: string; ndvi: number; label: string }>;
  computed_at: string;
}

export const satelliteApi = {
  getFarmAnalysis: (farmerId: string) =>
    api.get<{ data: SatelliteData; cached?: boolean }>(`/satellite/farm/${farmerId}?_cb=${Date.now()}`),

  getFarmTimeseries: (farmerId: string, months: number = 12) =>
    api.get<{ data: { timeseries: TimeseriesPoint[]; months: number }; cached?: boolean }>(`/satellite/farm/${farmerId}/timeseries`, {
      params: { months, _cb: Date.now() },
    }),

  getFarmTiles: (farmerId: string) =>
    api.get<{ data: TileUrls }>(`/satellite/farm/${farmerId}/tiles?_cb=${Date.now()}`),

  getFarmThumbnail: (farmerId: string) =>
    api.get<{ data: ThumbnailResponse }>(`/satellite/farm/${farmerId}/thumbnail?_cb=${Date.now()}`),

  getFarmByUdlrn: (udlrn: string) =>
    api.get<{ data: SatelliteData; cached?: boolean }>(`/satellite/udlrn/${udlrn}?_cb=${Date.now()}`),

  getDirectThumbnail: (lat: number, lng: number, radiusM: number = 5000) =>
    api.get<{ data: ThumbnailResponse }>('/satellite/thumbnail', {
      params: { lat, lng, radius_m: radiusM, _cb: Date.now() },
    }),

  analyzeRegion: (state: string, district: string, startDate: string, endDate: string) =>
    api.post<{ data: RegionAnalysis; cached?: boolean }>('/satellite/region/analyze', {
      state,
      district,
      start_date: startDate,
      end_date: endDate,
      _cb: Date.now(),
    }),

  getStates: () =>
    api.get<{ data: string[] }>('/satellite/states'),

  getDistricts: (state: string) =>
    api.get<{ data: string[]; state: string }>('/satellite/districts', { params: { state } }),

  getVisitBrief: (visitId: string) =>
    api.get<{ data: SatelliteData }>(`/satellite/visit/${visitId}?_cb=${Date.now()}`),

  refreshCache: () =>
    api.post('/satellite/refresh'),

  verifyLandSatellite: (lat: number, lng: number, startDate?: string, endDate?: string) =>
    api.post<{ data: {
      lat: number;
      lng: number;
      ndvi: number | null;
      ndvi_label: string | null;
      scan_date: string | null;
      cloud_cover_pct: number | null;
      soil_moisture: number | null;
      moisture_label: string | null;
      flood_detected: boolean | null;
      flood_area_ha: number | null;
      fire_detected: boolean | null;
      hotspot_count: number | null;
      thumbnail_b64: string;
      satellite_tile: any;
      ndvi_tile: any;
      fraud_score: number;
      fraud_risk: string;
      crop_coverage: number | null;
      baseline_match: string;
      sar_status: string;
      computed_at: string;
      start_date: string;
      end_date: string;
    }; success: boolean; error?: string; message?: string }>('/satellite/verify', {
      lat,
      lng,
      start_date: startDate,
      end_date: endDate,
    }),
};
