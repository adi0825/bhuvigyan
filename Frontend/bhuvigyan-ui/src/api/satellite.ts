import api from './axios';

export interface SatelliteData {
  udlrn?: string;
  farmer_id?: string;
  land_area_ha?: number;
  declared_crop?: string;
  gps_lat?: number;
  gps_lng?: number;
  satellite_analysis?: {
    ndvi: {
      ndvi: number;
      health_label: string;
      scan_date: string;
      cloud_cover_pct: number;
      source: string;
    };
    ndwi: {
      ndwi: number;
      label: string;
      moisture_status: string;
      scan_date: string;
    };
    sar_flood: {
      flood_detected: boolean;
      confidence: number;
      scan_date: string;
      source: string;
    };
    fire: {
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
    thumbnail_b64: string;
    computed_at: string;
  };
  ndvi?: {
    ndvi: number;
    health_label: string;
    scan_date: string;
    cloud_cover_pct: number;
    source: string;
  };
  ndwi: {
    ndwi: number;
    label: string;
    moisture_status: string;
    scan_date: string;
  };
  sar_flood: {
    flood_detected: boolean;
    confidence: number;
    scan_date: string;
    source: string;
  };
  fire: {
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
  farm_name: string;
  lat: number;
  lng: number;
  buffer_m: number;
  scanned_at: string;
  computed_at?: string;
}

export interface TimeseriesPoint {
  month: string;
  ndvi: number;
  label: string;
  image_count: number;
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
    api.get<{ data: SatelliteData; cached?: boolean }>(`/satellite/farm/${farmerId}`),

  getFarmTimeseries: (farmerId: string, months: number = 12) =>
    api.get<{ data: { timeseries: TimeseriesPoint[]; months: number }; cached?: boolean }>(`/satellite/farm/${farmerId}/timeseries`, {
      params: { months },
    }),

  getFarmTiles: (farmerId: string) =>
    api.get<{ data: TileUrls }>(`/satellite/farm/${farmerId}/tiles`),

  getFarmThumbnail: (farmerId: string) =>
    api.get<{ data: ThumbnailResponse }>(`/satellite/farm/${farmerId}/thumbnail`),

  getFarmByUdlrn: (udlrn: string) =>
    api.get<{ data: SatelliteData; cached?: boolean }>(`/satellite/udlrn/${udlrn}`),

  getDirectThumbnail: (lat: number, lng: number, radiusM: number = 5000) =>
    api.get<{ data: ThumbnailResponse }>('/satellite/thumbnail', {
      params: { lat, lng, radius_m: radiusM },
    }),

  analyzeRegion: (state: string, district: string, startDate: string, endDate: string) =>
    api.post<{ data: RegionAnalysis; cached?: boolean }>('/satellite/region/analyze', {
      state,
      district,
      start_date: startDate,
      end_date: endDate,
    }),

  getStates: () =>
    api.get<{ data: string[] }>('/satellite/states'),

  getDistricts: (state: string) =>
    api.get<{ data: string[]; state: string }>('/satellite/districts', { params: { state } }),

  getVisitBrief: (visitId: string) =>
    api.get<{ data: SatelliteData }>(`/satellite/visit/${visitId}`),

  refreshCache: () =>
    api.post('/satellite/refresh'),
};
