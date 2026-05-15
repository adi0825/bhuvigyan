import { useState, useCallback } from 'react';
import { resolveVillage, verifyCoordinates, saveLandLocation, getFarmerLand } from '../api/land';
import type { VillageResolution, CoordinateVerification, SavedLocation, FarmerLandRecord } from '../api/land';

export function useLandData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async (
    state: string, district: string, taluk: string, village: string
  ): Promise<VillageResolution | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await resolveVillage(state, district, taluk, village);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const verify = useCallback(async (
    lat: number, lng: number, declaredVillage?: string, declaredDistrict?: string
  ): Promise<CoordinateVerification | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await verifyCoordinates(lat, lng, declaredVillage, declaredDistrict);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveLocation = useCallback(async (
    lat: number, lng: number, boundaryGeojson?: string, areaHaDrawn?: number
  ): Promise<SavedLocation | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await saveLandLocation(lat, lng, boundaryGeojson, areaHaDrawn);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getLand = useCallback(async (farmerId: string): Promise<FarmerLandRecord | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFarmerLand(farmerId);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { resolve, verify, saveLocation, getLand, loading, error };
}
