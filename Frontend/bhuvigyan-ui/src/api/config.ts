import api from './axios';

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export const listConfigs = async (): Promise<SystemConfig[]> => {
  const res = await api.get('/config');
  return res.data;
};

export const getConfig = async (key: string): Promise<SystemConfig> => {
  const res = await api.get(`/config/${key}`);
  return res.data;
};

export const updateConfig = async (key: string, value: string, description?: string) => {
  const res = await api.put(`/config/${key}`, { value, description });
  return res.data;
};
