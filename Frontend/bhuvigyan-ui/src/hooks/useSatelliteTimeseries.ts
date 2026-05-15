import { useState, useEffect, useCallback } from 'react';
import { satelliteApi, type TimeseriesPoint } from '../api/satellite';

interface UseSatelliteTimeseriesResult {
  timeseries: TimeseriesPoint[];
  months: number;
  loading: boolean;
  error: string | null;
  isCached: boolean;
  refetch: () => Promise<void>;
}

export function useSatelliteTimeseries(
  farmerId: string,
  months: number = 12
): UseSatelliteTimeseriesResult {
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
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
      const res = await satelliteApi.getFarmTimeseries(farmerId, months);
      const payload = res.data;
      const timeseriesData = payload?.data?.timeseries || payload?.timeseries || [];
      if (timeseriesData.length > 0) {
        setTimeseries(timeseriesData);
        setIsCached(payload?.cached || payload?.data?.cached || false);
      } else {
        setError('No timeseries data available');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.detail || err?.message || 'Failed to load NDVI timeseries';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [farmerId, months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { timeseries, months, loading, error, isCached, refetch: fetchData };
}
