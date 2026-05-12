import { useState, useCallback } from 'react';
import { satelliteApi, type RegionAnalysis } from '../api/satellite';

interface UseRegionSatelliteResult {
  data: RegionAnalysis | null;
  loading: boolean;
  error: string | null;
  isCached: boolean;
  analyze: (state: string, district: string, startDate: string, endDate: string) => Promise<void>;
}

export function useRegionSatellite(): UseRegionSatelliteResult {
  const [data, setData] = useState<RegionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const analyze = useCallback(async (
    state: string,
    district: string,
    startDate: string,
    endDate: string
  ) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await satelliteApi.analyzeRegion(state, district, startDate, endDate);
      const payload = res.data;
      if (payload.data) {
        setData(payload.data);
        setIsCached(payload.cached || false);
      } else {
        setError('No region analysis data available');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to analyze region';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, isCached, analyze };
}
