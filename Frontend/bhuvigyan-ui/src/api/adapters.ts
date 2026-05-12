import api from './axios';

export interface StateAdapter {
  id: string;
  stateCode: string;
  name: string;
  configJson: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StateAdapterCreate {
  stateCode: string;
  name: string;
  configJson: Record<string, any>;
  active?: boolean;
}

export const listAdapters = async (): Promise<StateAdapter[]> => {
  const res = await api.get('/adapters');
  return res.data;
};

export const getAdapter = async (stateCode: string): Promise<StateAdapter> => {
  const res = await api.get(`/adapters/${stateCode}`);
  return res.data;
};

export const createAdapter = async (data: StateAdapterCreate) => {
  const res = await api.post('/adapters', data);
  return res.data;
};

export const updateAdapter = async (stateCode: string, data: Partial<StateAdapterCreate>) => {
  const res = await api.put(`/adapters/${stateCode}`, data);
  return res.data;
};
