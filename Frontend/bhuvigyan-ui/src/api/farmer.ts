import api from './axios';
import type {
  FarmerProfile,
  LandData,
  CarbonData,
  Notification,
  Claim,
  LoginResponse,
  EnrolmentRequest,
} from '../types';

export const farmerApi = {
  sendOtp: (mobile: string) =>
    api.post('/farmer/login', { mobile }),

  verifyOtp: (mobile: string, otp: string) =>
    api.post<LoginResponse>('/farmer/verify-otp', { mobile, otp, purpose: 'LOGIN' }),

  login: (mobile: string) =>
    api.post<{ devOtp?: string }>('/farmer/login', { mobile }),

  getProfile: () => api.get<FarmerProfile>('/farmer/profile'),

  getLand: () => api.get<LandData>('/farmer/land'),

  getNotifications: () => api.get<Notification[]>('/farmer/notifications'),

  markRead: (notifId: string) =>
    api.post(`/farmer/notifications/mark-read/${notifId}`),

  markAllRead: () =>
    api.post('/farmer/notifications/mark-all-read'),

getCarbon: () => api.get<CarbonData>('/farmer/carbon'),

  getClaims: () => api.get<Claim[]>('/farmer/claims'),

  fileClaim: (data: {
    udlrn: string;
    damageCause: string;
    damagePercent: number;
    damageDate: string;
    description?: string;
  }) => api.post('/farmer/claims', data),

  getSatellite: () => api.get('/farmer/satellite'),

  enrolCarbon: (data: { practiceType: string; udlrn: string }) =>
    api.post('/farmer/carbon/enrol', data),

  register: (data: {
    fullName: string; mobile: string; language: string; dob: string;
    gender: string; aadhaar: string; state: string; district: string;
    taluk: string; hobli?: string; village: string; surveyNumber: string;
    landAreaHa: number; ownershipType: string; bankAccount: string;
    bankIfsc: string; bankName: string;
  }) => api.post('/farmer/register', data),

  getWeather: (district: string, state?: string) =>
    api.get('/farmer/weather', { params: { district, state } }),

  getReports: () => api.get('/farmer/reports'),

  getNdviHistory: () => api.get('/farmer/ndvi-history'),

  getSatelliteData: () => api.get('/farmer/satellite/all'),
};
