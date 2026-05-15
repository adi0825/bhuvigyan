import api from './axios';

export interface VillageResolution {
  found: boolean;
  centroid_lat: number | null;
  centroid_lng: number | null;
  kgis_village_code: string;
  kgis_village_name: string;
  kgis_taluk: string;
  kgis_district: string;
  geometry?: Record<string, unknown>;
}

export interface CoordinateVerification {
  verified: boolean;
  kgis_village: string | null;
  kgis_district: string | null;
  kgis_taluk: string | null;
  kgis_village_code: string | null;
  matches_declared: boolean;
  village_match: boolean;
  district_match: boolean;
  reason: string;
}

export interface SavedLocation {
  farmer_id: string;
  lat: number;
  lng: number;
  area_check: {
    drawn_ha: number;
    registered_ha: number;
    diff_pct: number;
    within_tolerance: boolean;
    warning: boolean;
  } | null;
  status: string;
}

export interface FarmerLandRecord {
  farmer_id: string;
  full_name: string;
  mobile: string;
  state_code: string;
  district: string;
  taluk: string;
  village: string;
  survey_number: string;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  land_area_ha: number | null;
  declared_crop: string | null;
  udlrn: string | null;
}

export const resolveVillage = async (
  state: string,
  district: string,
  taluk: string,
  village: string
): Promise<VillageResolution> => {
  const res = await api.get('/land/resolve-village', {
    params: { state, district, taluk, village },
  });
  return res.data?.data || res.data;
};

export const verifyCoordinates = async (
  lat: number,
  lng: number,
  declaredVillage?: string,
  declaredDistrict?: string
): Promise<CoordinateVerification> => {
  const res = await api.get('/land/verify-coordinates', {
    params: { lat, lng, declared_village: declaredVillage, declared_district: declaredDistrict },
  });
  return res.data?.data || res.data;
};

export const saveLandLocation = async (
  lat: number,
  lng: number,
  boundaryGeojson?: string,
  areaHaDrawn?: number
): Promise<SavedLocation> => {
  const res = await api.post('/land/save-location', null, {
    params: { lat, lng, boundary_geojson: boundaryGeojson, area_ha_drawn: areaHaDrawn },
  });
  return res.data?.data || res.data;
};

export const getFarmerLand = async (farmerId: string): Promise<FarmerLandRecord> => {
  const res = await api.get(`/land/farmer/${farmerId}`);
  return res.data?.data || res.data;
};

export interface LandLookupResult {
  surveyNumber: string;
  village: string;
  taluk: string;
  district: string;
  state: string;
  centroidLat: number;
  centroidLng: number;
  kgisVillageCode: string;
  kgisVillageName: string;
  polygonAreaHa: number;
  geometry?: Record<string, unknown>;
  source: string;
}

export const lookupLand = async (data: {
  state: string;
  district: string;
  taluk: string;
  village: string;
  surveyNumber?: string;
}): Promise<LandLookupResult> => {
  const res = await api.post('/land/lookup', data);
  return res.data?.data || res.data;
};

export const getSurveyPolygon = async (
  kgisVillageId: string,
  surveyNumber: string
): Promise<any> => {
  const res = await api.get(`/land/survey-polygon/${kgisVillageId}/${surveyNumber}`);
  return res.data?.data || res.data;
};

export const getNearbyAdmin = async (
  lat: number,
  lng: number,
  distance?: number,
  aoi?: string
): Promise<any> => {
  const res = await api.get('/land/nearby-admin', {
    params: { lat, lng, distance: distance || 5000, aoi: aoi || 'd,t,h' },
  });
  return res.data?.data || res.data;
};

export const getAdminHierarchy = async (
  code: string,
  type: string = 'lgd'
): Promise<any> => {
  const res = await api.get('/land/admin-hierarchy', {
    params: { code, type },
  });
  return res.data?.data || res.data;
};

export const getSurveyNumbers = async (
  villageCode: string,
  lat: number,
  lng: number,
  distance?: number
): Promise<any> => {
  const res = await api.get('/land/survey-numbers', {
    params: { village_code: villageCode, lat, lng, distance: distance || 500 },
  });
  return res.data?.data || res.data;
};

export const getDistricts = async (): Promise<any[]> => {
  const res = await api.get('/land/districts');
  return res.data?.data || res.data || [];
};

export const getTaluks = async (districtId: string): Promise<any[]> => {
  const res = await api.get('/land/taluks', { params: { districtCode: districtId } });
  return res.data?.data || res.data || [];
};

export const getHoblis = async (talukId: string): Promise<any[]> => {
  const res = await api.get('/land/hoblis', { params: { talukCode: talukId } });
  return res.data?.data || res.data || [];
};

export const getVillages = async (hobliId: string, talukRaw?: string, district?: string, state?: string): Promise<any[]> => {
  const res = await api.get('/land/villages', {
    params: {
      hobli_code: hobliId,
      taluk_raw: talukRaw,
      district: district,
      state: state
    }
  });
  return res.data?.data || res.data || [];
};

export const fetchRtc = async (data: any): Promise<any> => {
  const res = await api.post('/land/fetch-rtc', data);
  return res.data?.data || res.data;
};
