import { apiClient } from './client'

export interface District {
  DistrictName: string
  DistrictCode: string
  name?: string
  code?: string
}

export interface Taluk {
  TalukName: string
  TalukCode: string
  name?: string
  code?: string
}

export interface Hobli {
  HobliName: string
  HobliCode: string
  name?: string
  code?: string
}

export interface Village {
  VillageName: string
  VillageCode: string
  name?: string
  code?: string
}

export async function fetchDistricts(state = 'karnataka'): Promise<District[]> {
  const res = await apiClient.get('/land/districts', { params: { state } })
  const data = res.data?.data ?? res.data ?? []
  return normalizeArray(data)
}

export async function fetchTaluks(districtCode: string, state = 'karnataka'): Promise<Taluk[]> {
  const res = await apiClient.get('/land/taluks', { params: { districtCode, state } })
  const data = res.data?.data ?? res.data ?? []
  return normalizeArray(data)
}

export async function fetchHoblis(talukCode: string): Promise<Hobli[]> {
  const res = await apiClient.get('/land/hoblis', { params: { talukCode } })
  const data = res.data?.data ?? res.data ?? []
  return normalizeArray(data)
}

export async function fetchVillages(hobliCode: string, talukRaw?: string, district?: string, state = 'karnataka'): Promise<Village[]> {
  const res = await apiClient.get('/land/villages', { params: { hobli_code: hobliCode, taluk_raw: talukRaw, district, state } })
  const data = res.data?.data ?? res.data ?? []
  return normalizeArray(data)
}

export async function resolveVillage(state: string, district: string, taluk: string, village: string) {
  const res = await apiClient.post('/land/resolve-village', null, {
    params: { state, district, taluk, village }
  })
  return res.data?.data ?? res.data ?? {}
}

function normalizeArray(arr: any[]): any[] {
  if (!Array.isArray(arr)) return []
  return arr.map(item => ({
    ...item,
    name: item.name ?? item.DistrictName ?? item.TalukName ?? item.HobliName ?? item.VillageName ?? item.HobliName ?? '',
    code: item.code ?? item.DistrictCode ?? item.TalukCode ?? item.HobliCode ?? item.VillageCode ?? '',
  }))
}
