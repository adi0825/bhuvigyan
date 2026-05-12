import api from './axios';
import type {
  OfficerLoginResponse,
  OfficerStats,
  OfficerVisit,
  VisitDetail,
  GpsVerificationResult,
  InspectionFormData,
  VisitPhoto,
  DisasterEventActive,
  AdminVisit,
} from '../types';

export const officerApi = {
  // Auth
  sendOtp: (email: string) => api.post('/officer/send-otp', { email }),

  login: (email: string, otp: string) =>
    api.post<{ success: boolean; data: OfficerLoginResponse }>('/officer/login', { email, otp }),

  // Stats
  getStats: () => api.get<{ success: boolean; data: OfficerStats }>('/officer/stats'),

  // Visits
  getVisits: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: { visits: OfficerVisit[]; total: number; pending: number; completed: number } }>('/officer/visits', { params }),

  getVisit: (id: string) =>
    api.get<{ success: boolean; data: VisitDetail }>(`/officer/visits/${id}`),

  startVisit: (id: string, gpsLat: number, gpsLng: number) =>
    api.post<{ success: boolean; data: GpsVerificationResult }>(`/officer/visits/${id}/start`, { gpsLat, gpsLng }),

  submitVisit: (id: string, data: InspectionFormData) =>
    api.post<{ success: boolean; data: { visitNumber: string } }>(`/officer/visits/${id}/submit`, data),

  // Photos
  uploadPhoto: (visitId: string, payload: { photoUrl: string; photoType: string; caption?: string; gpsLat?: number; gpsLng?: number }) =>
    api.post<{ success: boolean; data: { photoUrl: string; id: string } }>(`/officer/visits/${visitId}/photos`, payload),

  getPhotos: (visitId: string) =>
    api.get<{ success: boolean; data: VisitPhoto[] }>(`/officer/visits/${visitId}/photos`),
};

// ── ADMIN API ──

export const adminVisitApi = {
  getVisits: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ success: boolean; data: AdminVisit[] }>('/admin/visits', { params }),

  assignVisit: (data: {
    claimId: string;
    officerId: string;
    scheduledDate: string;
    priority?: string;
    notes?: string;
  }) => api.post<{ success: boolean; data: { visitNumber: string } }>('/admin/visits/assign', data),
};

export const disasterApi = {
  declare: (data: {
    eventName: string;
    disasterType: string;
    affectedDistricts: string[];
    startDate: string;
    endDate: string;
    description?: string;
  }) => api.post<{ success: boolean; data: { disasterId: string; autoApproved: number; autoApprovedAmount: number; flaggedOutliers: number } }>('/admin/disaster-mode', data),

  getActive: () => api.get<{ success: boolean; data: DisasterEventActive | null }>('/admin/disaster-mode'),

  deactivate: (id: string) => api.put(`/admin/disaster-mode/${id}/deactivate`, {}),
};
