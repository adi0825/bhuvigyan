import api from './axios';

export interface EvidenceItem {
  id: string;
  entityType: string;
  entityId: string;
  evidenceType: string;
  fileHash: string;
  storageUrl: string;
  meta_data: Record<string, any> | null;
  createdAt: string;
}

export const createEvidence = async (data: Omit<EvidenceItem, 'id' | 'createdAt'>) => {
  const res = await api.post('/evidence', data);
  return res.data;
};

export const listEvidence = async (entityType: string, entityId: string): Promise<EvidenceItem[]> => {
  const res = await api.get(`/evidence/${entityType}/${entityId}`);
  return res.data;
};
