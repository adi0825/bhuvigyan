import { useState, useEffect, useCallback } from 'react';
import { myLandApi, type LandHolding, type SatelliteVerification } from '../api/myLand';

interface UseMyLandResult {
  holdings: LandHolding[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addHolding: (data: Parameters<typeof myLandApi.addLandHolding>[0]) => Promise<{ id: string; label: string } | null>;
  deleteHolding: (id: string) => Promise<boolean>;
  verifyHolding: (id: string) => Promise<SatelliteVerification | null>;
  verificationLoading: string | null;  // holding ID being verified
  verificationProgress: Array<{ step: string; status: string; message?: string }>;
}

export function useMyLand(farmerId: string | null): UseMyLandResult {
  const [holdings, setHoldings] = useState<LandHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState<string | null>(null);
  const [verificationProgress, setVerificationProgress] = useState<Array<{ step: string; status: string; message?: string }>>([]);

  const fetchHoldings = useCallback(async () => {
    if (!farmerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await myLandApi.getLandHoldings(farmerId);
      const data = (res.data as any)?.data || res.data;
      setHoldings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch land holdings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const addHolding = async (data: Parameters<typeof myLandApi.addLandHolding>[0]) => {
    try {
      const res = await myLandApi.addLandHolding(data);
      const result = (res.data as any)?.data || res.data;
      await fetchHoldings();
      return { id: result.id, label: result.label };
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to add land holding');
      return null;
    }
  };

  const deleteHolding = async (id: string) => {
    try {
      await myLandApi.deleteLandHolding(id);
      await fetchHoldings();
      return true;
    } catch {
      return false;
    }
  };

  const verifyHolding = async (id: string): Promise<SatelliteVerification | null> => {
    if (!farmerId) return null;
    setVerificationLoading(id);
    setVerificationProgress([]);
    try {
      const res = await myLandApi.verifyLand(id, farmerId);
      const result = (res.data as any)?.data || res.data;
      if (result?.pipeline_steps) {
        setVerificationProgress(result.pipeline_steps);
      }
      await fetchHoldings();
      return result;
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Verification failed');
      return null;
    } finally {
      setVerificationLoading(null);
    }
  };

  return {
    holdings,
    loading,
    error,
    refetch: fetchHoldings,
    addHolding,
    deleteHolding,
    verifyHolding,
    verificationLoading,
    verificationProgress
  };
}
