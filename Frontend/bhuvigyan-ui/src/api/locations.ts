import api from './axios';
import type { Location } from '../types';

export const locationApi = {
  getStates: () => api.get<Location[]>('/locations/states'),

  getDistricts: (stateCode: string) =>
    api.get<Location[]>(`/locations/districts`, { params: { stateCode } }),

  getTaluks: (districtId: string) =>
    api.get<Location[]>(`/locations/taluks`, { params: { districtId } }),

  getHoblis: (talukId: string) =>
    api.get<Location[]>(`/locations/hoblis`, { params: { talukId } }),

  getVillages: (hobliId: string) =>
    api.get<Location[]>(`/locations/villages`, { params: { hobliId } }),

  resolveUdrln: (body: { surveyNo: string; districtId: string; talukId: string; villageId: string }) =>
    api.post<Location>('/locations/udlrn/resolve', body),

  getUdrln: (udlrn: string) =>
    api.get(`/locations/udlrn/${udlrn}`),
};