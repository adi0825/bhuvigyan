import api from './axios';

export interface FraudScore {
  score: number;
  confidence: number;
  riskLevel: string;
  modelVersion: string;
  explanation?: {
    topFactors: Array<{ name: string; weight: number; direction: string; description: string }>;
    humanReadableText: string;
  };
}

export interface ScoreOverrideRequest {
  overrideScore: number;
  overrideReason: string;
}

export const getFraudScore = async (claimId: string): Promise<FraudScore> => {
  const res = await api.get(`/fraud-scores/${claimId}`);
  return res.data.data;
};

export const overrideFraudScore = async (claimId: string, data: ScoreOverrideRequest) => {
  const res = await api.post(`/fraud-scores/${claimId}/override`, data);
  return res.data;
};

export const triggerScoring = async (claimId: string) => {
  const res = await api.post(`/admin/claims/${claimId}/score`);
  return res.data;
};
