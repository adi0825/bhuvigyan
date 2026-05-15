import api from './axios';

export const insurerApi = {
  login: (email: string, password: string, company: string) =>
    api.post('/insurer/login', { email, password, company }),

  getDashboardStats: () =>
    api.get('/insurer/dashboard-stats'),

  getClaimsQueue: (params?: any) =>
    api.get('/insurer/claims-queue', { params }),

  getClaim: (claimId: string) =>
    api.get(`/insurer/claim/${claimId}`),

  approveClaim: (payload: { claimId: string; approvedAmount: number; officerNotes: string }) =>
    api.post('/insurer/approve-claim', payload),

  rejectClaim: (payload: { claimId: string; rejectionReason: string; officerNotes: string }) =>
    api.post('/insurer/reject-claim', payload),

  fieldVisit: (payload: { claimId: string; assignedOfficer: string; officerNotes: string }) =>
    api.post('/insurer/field-visit', payload),

  escalateAlert: (payload: { alertId: string; notes: string }) =>
    api.post('/insurer/escalate-alert', payload),

  getFraudAlerts: (severity?: string) =>
    api.get('/insurer/fraud-alerts', { params: { severity } }),

  getHeatmapData: () =>
    api.get('/insurer/heatmap-data'),

  getAnalytics: () =>
    api.get('/insurer/analytics'),
};
