import api from './axios';

export const inspectorApi = {
  // Auth
  login: (mobile: string, password: string) =>
    api.post('/inspector/auth/login', { mobile, password }),

  // Profile
  getProfile: (inspectorId: string) =>
    api.get(`/inspector/profile?inspector_id=${inspectorId}`),
  updateProfile: (inspectorId: string, data: any) =>
    api.put(`/inspector/profile?inspector_id=${inspectorId}`, data),

  // Dashboard
  getDashboard: (inspectorId: string) =>
    api.get(`/inspector/dashboard?inspector_id=${inspectorId}`),

  // Visits
  getVisits: (inspectorId: string, status?: string) =>
    api.get(`/inspector/visits?inspector_id=${inspectorId}${status ? `&status=${status}` : ''}`),
  getVisitDetail: (visitId: string) =>
    api.get(`/inspector/visits/${visitId}`),
  acknowledgeVisit: (visitId: string, inspectorId: string, scheduledDate: string) =>
    api.post(`/inspector/visits/${visitId}/acknowledge?inspector_id=${inspectorId}`, { scheduled_date: scheduledDate }),
  startVisit: (visitId: string, inspectorId: string, gpsLat: number, gpsLng: number) =>
    api.post(`/inspector/visits/${visitId}/start?inspector_id=${inspectorId}`, { gps_lat: gpsLat, gps_lng: gpsLng }),
  abandonVisit: (visitId: string, inspectorId: string, reason: string) =>
    api.delete(`/inspector/visits/${visitId}/abandon?inspector_id=${inspectorId}`, { data: { reason } }),

  // Report
  submitReport: (visitId: string, inspectorId: string, report: any) =>
    api.post(`/inspector/visits/${visitId}/report?inspector_id=${inspectorId}`, report),
  uploadPhotos: (visitId: string, photos: any[]) =>
    api.post(`/inspector/visits/${visitId}/photos`, { photos }),
  addCcePlot: (visitId: string, plot: any) =>
    api.post(`/inspector/visits/${visitId}/cce-plots`, plot),

  // History
  getHistory: (inspectorId: string) =>
    api.get(`/inspector/visits/history?inspector_id=${inspectorId}`),
};

export const adminInspectorApi = {
  // Inspector CRUD
  createInspector: (data: any) =>
    api.post('/admin/inspectors', data),
  listInspectors: (state?: string) =>
    api.get(`/admin/inspectors${state ? `?state=${state}` : ''}`),
  getInspector: (id: string) =>
    api.get(`/admin/inspectors/${id}`),
  updateInspector: (id: string, data: any) =>
    api.put(`/admin/inspectors/${id}`, data),

  // Visit assignment
  assignInspector: (claimId: string, adminId: string, data: any) =>
    api.post(`/admin/inspectors/claims/${claimId}/assign-inspector?admin_id=${adminId}`, data),

  // Visit management
  listVisits: (status?: string) =>
    api.get(`/admin/inspectors/visits${status ? `?status=${status}` : ''}`),
  getVisitDetail: (visitId: string) =>
    api.get(`/admin/inspectors/visits/${visitId}`),
  verifyReport: (visitId: string, verified: boolean, adminNotes?: string) =>
    api.put(`/admin/inspectors/visits/${visitId}/verify-report`, { verified, admin_notes: adminNotes }),

  // Performance
  getPerformance: () =>
    api.get('/admin/inspectors/performance'),
};
