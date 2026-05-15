import api from './axios';

export const cscApi = {
  login: (cscId: string, password: string, state: string) =>
    api.post('/csc/login', { cscId, password, state }),

  getStats: () =>
    api.get('/csc/stats'),

  getDailyCount: () =>
    api.get('/csc/daily-count'),

  lookupFarmer: (udlrm: string) =>
    api.get(`/csc/farmer-lookup/${udlrm}`),

  submitClaim: (payload: any) =>
    api.post('/csc/submit-claim', payload),

  getMyClaims: (params?: any) =>
    api.get('/csc/my-claims', { params }),

  getClaim: (claimId: string) =>
    api.get(`/csc/claim/${claimId}`),

  getFraudAlerts: () =>
    api.get('/csc/fraud-alerts'),
};
