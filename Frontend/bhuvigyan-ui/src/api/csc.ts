import api from './axios';
import type { Location } from '../types';

export const cscApi = {
  login: (cscId: string, password: string, totp: string) =>
    api.post('/csc/login', { cscId, password, totpCode: totp }),

  getStats: () =>
    api.get('/csc/stats'),

  getTodayRegistrations: () =>
    api.get('/csc/registrations/today'),

  getTotalRegistrations: () =>
    api.get('/csc/registrations/total'),

  registerFarmer: (data: {
    fullName: string;
    mobile: string;
    stateCode: string;
    districtCode: string;
    districtId: string;
    talukId: string;
    hobliId: string;
    villageId: string;
    landAreaHa: number;
    declaredCrop: string;
  }) =>
    api.post('/csc/register-farmer', {
      fullName: data.fullName,
      mobile: data.mobile,
      state_code: data.stateCode,
      district: data.districtId,
      district_id: data.districtId,
      taluk_id: data.talukId,
      hobli_id: data.hobliId,
      village_id: data.villageId,
      land_area: data.landAreaHa,
      land_unit: 'Ha',
      crop_name: data.declaredCrop,
    }),

  lookupFarmer: (mobile: string) =>
    api.get(`/csc/farmer/lookup/${mobile}`),
};

export interface CscStats {
  todayRegistrations: number;
  totalRegistrations: number;
  cscId: string;
  cscName: string;
  district: string;
  dailyLimit: number;
  usedToday: number;
}
