import { useState, useEffect, useCallback } from 'react';
import { satelliteApi, type SatelliteData } from '../api/satellite';

interface UseSatelliteDataResult {
  data: SatelliteData | null;
  loading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => Promise<void>;
}

export function useSatelliteData(farmerId: string | null): UseSatelliteDataResult {
  const [data, setData] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchData = useCallback(async () => {
    if (!farmerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await satelliteApi.getFarmAnalysis(farmerId);
      const payload: any = res.data;

      // Backend returns {success: false, error, message} on failure
      if (payload?.success === false) {
        setError(payload.message || payload.error || 'Satellite analysis failed');
        setData(null);
        setLoading(false);
        return;
      }

      const backendData: any = payload?.data || payload;
      console.log('[useSatelliteData] raw response:', payload);
      console.log('[useSatelliteData] backendData:', backendData);
      if (backendData) {
        const fireAlerts = backendData.satellite_analysis?.fire_alerts;
        const fireField = backendData.satellite_analysis?.fire;
        const flattened: SatelliteData = {
          ...backendData,
          ndvi: backendData.satellite_analysis?.ndvi,
          ndwi: backendData.satellite_analysis?.ndwi,
          sar_flood: backendData.satellite_analysis?.sar_flood,
          fire: fireAlerts ? {
            detected: fireAlerts.fire_detected,
            hotspot_count: fireAlerts.hotspot_count,
            closest_distance_km: fireAlerts.closest_distance_km,
            source: fireAlerts.source,
            scan_date: fireAlerts.scan_date,
          } : fireField,
          satellite_tile: backendData.satellite_analysis?.satellite_tile,
          ndvi_tile: backendData.satellite_analysis?.ndvi_tile,
          thumbnail_b64: backendData.satellite_analysis?.thumbnail_b64,
          computed_at: backendData.computed_at || backendData.satellite_analysis?.computed_at,
          cached: backendData.cached,
        };
        setData(flattened);
        setIsCached(backendData.cached || false);
      } else {
        setError('No satellite data available');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Failed to load satellite data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isCached, refetch: fetchData };
}
