import { useState, useEffect, useCallback } from 'react';
import { satelliteApi, type SatelliteData } from '../api/satellite';

interface UseSatelliteDataResult {
  data: SatelliteData | null;
  loading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => Promise<void>;
}

export function useSatelliteData(farmerId: string): UseSatelliteDataResult {
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
      const payload = res.data;
      if (payload.data) {
        setData(payload.data);
        setIsCached(payload.cached || false);
      } else {
        setError('No satellite data available');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load satellite data';
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
