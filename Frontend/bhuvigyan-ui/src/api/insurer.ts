import api from './axios';
import type { Claim, LoginResponse } from '../types';

export const insurerApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/insurer/login', { email, password }),

  getDashboard: () =>
    api.get('/insurer/dashboard'),

  getClaims: (filters?: {
    status?: string;
    district?: string;
    fromDate?: string;
    toDate?: string;
  }) =>
    api.get('/insurer/claims', { params: filters }),

  getClaim: (claimId: string) =>
    api.get(`/insurer/claims/${claimId}`),

  approveClaim: (claimId: string, notes?: string) =>
    api.post(`/insurer/claims/${claimId}/approve`, { notes }),

  rejectClaim: (claimId: string, reason: string) =>
    api.post(`/insurer/claims/${claimId}/reject`, { reason }),

  getStats: () =>
    api.get('/insurer/stats'),

  getSettlements: (status?: string) =>
    api.get('/insurer/settlements', { params: status ? { status } : {} }),
};

export interface InsurerDashboard {
  totalClaims: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  approvedAmount: number;
  pendingAmount: number;
}

export interface InsurerStats {
  totalClaims: number;
  totalAmount: number;
  approvedCount: number;
  approvedAmount: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface Settlement {
  id: string;
  claimId: string;
  claimNumber: string;
  farmerId: string;
  farmerName: string;
  udlrn: string;
  settlementAmount: number;
  paymentDate: string;
  status: string;
  utrNumber: string;
  npciRefId: string;
}
