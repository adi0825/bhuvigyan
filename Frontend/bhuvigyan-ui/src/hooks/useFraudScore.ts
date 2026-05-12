import { useState, useEffect, useCallback } from 'react';
import { getFraudScore, overrideFraudScore, triggerScoring } from '../api/fraud';
import type { FraudScore, ScoreOverrideRequest } from '../api/fraud';

export function useFraudScore(claimId?: string) {
  const [score, setScore] = useState<FraudScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFraudScore(claimId);
      setScore(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load fraud score');
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const override = async (data: ScoreOverrideRequest) => {
    if (!claimId) return;
    setLoading(true);
    try {
      await overrideFraudScore(claimId, data);
      await fetchScore();
    } finally {
      setLoading(false);
    }
  };

  const reScore = async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      await triggerScoring(claimId);
      await fetchScore();
    } finally {
      setLoading(false);
    }
  };

  return { score, loading, error, override, reScore, refresh: fetchScore };
}
