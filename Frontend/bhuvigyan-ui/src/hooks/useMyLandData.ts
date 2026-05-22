import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import type { LandAnalyzeResponse, LandHolding } from '../types/myLand.types';

export interface MyLandDataState {
  holdings: LandHolding[];
  selectedHolding: LandHolding | null;
  analysis: LandAnalyzeResponse | null;
  loading: boolean;
  analysisLoading: boolean;
  error: string | null;
  analysisError: string | null;
  refreshAnalysis: () => Promise<void>;
  selectHolding: (holding: LandHolding) => void;
}

export function useMyLandData(farmerId: string | null, refreshKey: number = 0): MyLandDataState {
  const [holdings, setHoldings] = useState<LandHolding[]>([]);
  const [selectedHolding, setSelectedHolding] = useState<LandHolding | null>(null);
  const [analysis, setAnalysis] = useState<LandAnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    if (!farmerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/my-land/land-holdings/${farmerId}`);
      const data = res.data?.data || [];
      setHoldings(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedHolding) {
        setSelectedHolding(data[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch land holdings');
    } finally {
      setLoading(false);
    }
  }, [farmerId, refreshKey]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const refreshAnalysis = useCallback(async () => {
    if (!selectedHolding) return;
    const lat = selectedHolding.latitude;
    const lon = selectedHolding.longitude;
    if (lat == null || lon == null) {
      setAnalysisError('Coordinates not available for this holding');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await api.get('/land/analyze', {
        params: {
          lat,
          lon,
          survey_no: selectedHolding.survey_number,
          district: selectedHolding.district,
        },
      });
      if (res.data?.success && res.data?.data) {
        setAnalysis(res.data.data as LandAnalyzeResponse);
      } else {
        setAnalysisError(res.data?.error || 'Analysis returned no data');
      }
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || 'Analysis failed');
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedHolding]);

  useEffect(() => {
    if (selectedHolding && selectedHolding.latitude && selectedHolding.longitude) {
      refreshAnalysis();
    }
  }, [selectedHolding?.id]);

  const selectHolding = (holding: LandHolding) => {
    setSelectedHolding(holding);
    setAnalysis(null);
    setAnalysisError(null);
  };

  return {
    holdings,
    selectedHolding,
    analysis,
    loading,
    analysisLoading,
    error,
    analysisError,
    refreshAnalysis,
    selectHolding,
  };
}
