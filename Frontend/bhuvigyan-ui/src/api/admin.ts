import api from './axios';
import type { Claim, PaginatedResponse, Officer, FilterOptions, AdminStats } from '../types';

export const adminApi = {
  login: (email: string, password: string, totp: string) =>
    api.post('/admin/login', { email, password, totpCode: totp }),

  getStats: () => api.get<AdminStats>('/admin/stats'),

  getDashboardStats: () => api.get('/admin/stats'),

  getReviewQueue: (page: number = 1, limit: number = 10) =>
    api.get('/admin/claims', { params: { page, limit, sort_by: 'fraud_score', sort_order: 'desc' } }),

  getFarmers: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/farmers', { params }),

  getClaims: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    min_fraud_score?: number;
    max_fraud_score?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) => api.get('/admin/claims', { params }),

  getClaimDetail: (claimId: string) =>
    api.get(`/admin/claims/${claimId}`),

  approveClaim: (claimId: string, notes?: string) =>
    api.post(`/admin/claims/${claimId}/approve`, { notes }),

  rejectClaim: (claimId: string, reason: string) =>
    api.post(`/admin/claims/${claimId}/reject`, { reason }),

  assignVisit: (claimId: string, officerId: string) =>
    api.post(`/admin/claims/${claimId}/assign-visit`, { officerId }),

  getSatelliteEvidence: (claimId: string) =>
    api.get(`/admin/claims/${claimId}/satellite-evidence`),

  updateClaim: (claimId: string, data: { status?: string; notes?: string }) =>
    api.post(`/admin/claims/${claimId}/${data.status}`, data),

  getOfficers: () => api.get('/admin/officers'),

  getAuditLog: () => api.get('/admin/audit-log'),

  getFraudDistribution: () =>
    api.get('/admin/charts/fraud-distribution'),

  getVaoAlerts: () =>
    api.get('/admin/vao-alerts'),
};