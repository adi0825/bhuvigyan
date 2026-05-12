import api from './axios';

export const claimsApi = {
  fileClaim: (data: {
    udlrn: string;
    season: string;
    declaredCrop: string;
    sowingDate: string;
    damageDate: string;
    damageType: string;
    claimAmount: number;
    payoutAccountNo: string;
    payoutIfsc: string;
  }) =>
    api.post('/claims/file', data),

  getMyClaims: () =>
    api.get('/claims/my-claims'),

  getClaimStatus: (claimId: string) =>
    api.get(`/claims/status/${claimId}`),

  appealClaim: (claimId: string, reason: string) =>
    api.post(`/claims/appeal/${claimId}`, { reason }),
};

export const fraudApi = {
  getFraudSignals: (claimId: string) =>
    api.get(`/admin/fraud-signals/${claimId}`),

  getSatelliteEvidence: (claimId: string) =>
    api.get(`/admin/satellite-evidence/${claimId}`),

  getAuditLog: (udlrn: string) =>
    api.get(`/claims/audit-log/${udlrn}`),
};
