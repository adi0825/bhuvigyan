import api from './axios';
import type { ServiceHealth, SystemMode } from '../types';

const now = () => new Date().toISOString();

export const systemApi = {
  getMode: () => api.get<SystemMode>('/system/mode'),

  healthGateway: () =>
    api.get('/system/db-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthFarmer: () =>
    api.get('/system/sat-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthAdmin: () =>
    api.get('/system/health').then((res) => ({
      status: 'UP' as const,
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthClaims: () =>
    api.get('/admin/stats').then((res) => ({
      status: (res.data?.success ? 'UP' : 'DOWN') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthCCE: () =>
    api.get('/system/storage-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthInsurer: () =>
    api.get('/insurer/stats').then((res) => ({
      status: (res.data?.success ? 'UP' : 'DOWN') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthLocation: () =>
    api.get('/locations/states').then((res) => ({
      status: 'UP' as const,
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthPostgres: () =>
    api.get('/system/db-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthRedis: () =>
    api.get('/system/health').then((res) => ({
      status: 'UP' as const,
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthFraud: () =>
    api.get('/system/fraud-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),

  healthSatellite: () =>
    api.get('/system/sat-health').then((res) => ({
      status: (res.data?.status || 'UP') as 'UP' | 'DOWN',
      mode: res.data?.mode,
      responseTime: 0,
      lastChecked: now(),
    })).catch(() => ({
      status: 'DOWN' as const,
      responseTime: 0,
      lastChecked: now(),
    })),
};

export const defaultServices: ServiceHealth[] = [
  { name: 'API Server', port: 8000, url: '/api/v1', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
  { name: 'Database', port: 5432, url: '', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
  { name: 'Satellite', port: 0, url: '/api/v1/system/sat-health', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
  { name: 'Fraud Engine', port: 0, url: '', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
  { name: 'File Storage', port: 0, url: '', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
  { name: 'Locations', port: 8000, url: '/api/v1/locations/states', status: 'UNKNOWN', responseTime: 0, lastChecked: '' },
];