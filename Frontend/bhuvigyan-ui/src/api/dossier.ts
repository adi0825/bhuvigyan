import api from './axios';

export interface DossierData {
  claim: Record<string, any>;
  farmer: Record<string, any>;
  policy: Record<string, any>;
  inspection: Record<string, any>;
  fraud: Record<string, any>;
  evidence: Array<Record<string, any>>;
  generatedAt: string;
}

export const getDossier = async (claimId: string): Promise<DossierData> => {
  const res = await api.get(`/claims/${claimId}/dossier`);
  return res.data.data;
};

export const downloadDossierPdf = (claimId: string): string => {
  return `/api/v1/claims/${claimId}/dossier.pdf`;
};
