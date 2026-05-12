import api from './axios';
import type { LoginResponse } from '../types';

export const stateApi = {
  login: (email: string, password: string, totp: string) =>
    api.post<LoginResponse>('/state/login', { email, password, totp }),

  getDashboardStats: (stateCode: string) =>
    api.get('/state/dashboard-stats', { params: { stateCode } }),

  getFirAlerts: (stateCode: string, status?: string) =>
    api.get('/state/fir-alerts', { params: { stateCode, status } }),

  confirmFir: (alertId: string, data: {
    policeStation: string;
    notes?: string;
  }) =>
    api.post(`/state/fir-alerts/${alertId}/confirm`, data),

  dismissFir: (alertId: string, notes: string) =>
    api.post(`/state/fir-alerts/${alertId}/dismiss`, { notes }),

  getVaoAlerts: (stateCode: string, status?: string) =>
    api.get('/state/vao-alerts', { params: { stateCode, status } }),

  alertTahasildar: (alertId: string) =>
    api.post(`/state/vao-alerts/${alertId}/alert-tahasildar`, {}),

  getDistrictHeatmap: (stateCode: string) =>
    api.get('/state/district-heatmap', { params: { stateCode } }),

  getFraudTrends: (stateCode: string, period?: string) =>
    api.get('/state/fraud-trends', { params: { stateCode, period } }),
};

export interface StateDashboardStats {
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  totalFarmers: number;
  totalArea: number;
  fraudAlerts: number;
  firAlerts: number;
  vaoAlerts: number;
}

export interface FirAlert {
  id: string;
  claimId: string;
  claimNumber: string;
  udlrn: string;
  districtCode: string;
  districtName: string;
  farmerName: string;
  farmerMobile: string;
  fraudScore: number;
  status: string;
  filedAt: string;
  filedBy: string;
  confirmedBy?: string;
  confirmedAt?: string;
  policeStation?: string;
  dcNotes?: string;
}

export interface VaoAlert {
  id: string;
  udlrn: string;
  farmerName: string;
  farmerMobile: string;
  alertType: string;
  severity: string;
  description: string;
  status: string;
  assignedTahasildar?: string;
  tahasildarNotifiedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface DistrictHeatmapEntry {
  districtCode: string;
  districtName: string;
  totalClaims: number;
  fraudCount: number;
  fraudRate: number;
  topFraudType: string;
  color: string;
}
