import { create } from 'zustand'
import type { AnalysisResult } from '../api/analysis'

export interface AdminSelection {
  state: string
  district: { name: string; code: string } | null
  taluk: { name: string; code: string } | null
  hobli: { name: string; code: string } | null
  village: { name: string; code: string; kgis_village_id?: string } | null
  survey_number: string
  hissa_number: string
}

export interface AnalysisStore {
  selection: AdminSelection
  analysis: AnalysisResult | null
  isLoading: boolean
  error: string | null
  activeLayer: 'satellite' | 'ndvi' | 'rgb'
  setDistrict: (d: { name: string; code: string } | null) => void
  setTaluk: (t: { name: string; code: string } | null) => void
  setHobli: (h: { name: string; code: string } | null) => void
  setVillage: (v: { name: string; code: string; kgis_village_id?: string } | null) => void
  setSurveyNumber: (s: string) => void
  setHissaNumber: (s: string) => void
  setAnalysis: (analysis: AnalysisResult) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setActiveLayer: (layer: 'satellite' | 'ndvi' | 'rgb') => void
  reset: () => void
}

const initialSelection: AdminSelection = {
  state: 'Karnataka',
  district: null,
  taluk: null,
  hobli: null,
  village: null,
  survey_number: '',
  hissa_number: '1',
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  selection: initialSelection,
  analysis: null,
  isLoading: false,
  error: null,
  activeLayer: 'satellite',

  setDistrict: (d) =>
    set({
      selection: {
        ...initialSelection,
        district: d,
      },
      analysis: null,
      error: null,
    }),

  setTaluk: (t) =>
    set((state) => ({
      selection: {
        ...state.selection,
        taluk: t,
        hobli: null,
        village: null,
        survey_number: '',
      },
      analysis: null,
      error: null,
    })),

  setHobli: (h) =>
    set((state) => ({
      selection: {
        ...state.selection,
        hobli: h,
        village: null,
        survey_number: '',
      },
      analysis: null,
      error: null,
    })),

  setVillage: (v) =>
    set((state) => ({
      selection: {
        ...state.selection,
        village: v,
        survey_number: '',
      },
      analysis: null,
      error: null,
    })),

  setSurveyNumber: (s) =>
    set((state) => ({
      selection: { ...state.selection, survey_number: s },
    })),

  setHissaNumber: (s) =>
    set((state) => ({
      selection: { ...state.selection, hissa_number: s },
    })),

  setAnalysis: (analysis) => set({ analysis }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setActiveLayer: (activeLayer) => set({ activeLayer }),

  reset: () =>
    set({
      selection: initialSelection,
      analysis: null,
      isLoading: false,
      error: null,
    }),
}))
