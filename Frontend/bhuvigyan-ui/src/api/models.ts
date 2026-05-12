import api from './axios';

export interface ModelVersion {
  id: string;
  version: string;
  algorithm: string;
  featureCount: string;
  trainingDate: string;
  validationAuc: number | null;
  testAuc: number | null;
  status: 'STAGING' | 'PRODUCTION' | 'ARCHIVED';
  storagePath: string;
  createdAt: string;
}

export const listModels = async (): Promise<ModelVersion[]> => {
  const res = await api.get('/admin/model-registry');
  return res.data;
};

export const registerModel = async (data: Omit<ModelVersion, 'id' | 'createdAt'>) => {
  const res = await api.post('/admin/model-registry', data);
  return res.data;
};

export const promoteModel = async (modelId: string, notes?: string) => {
  const res = await api.post(`/admin/model-registry/${modelId}/promote`, { notes });
  return res.data;
};
