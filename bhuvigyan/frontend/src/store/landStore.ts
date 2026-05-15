import { create, type StoreApi } from 'zustand'
import type { AnalysisResult } from '../api/land'

export interface LandStore {
  analysis: AnalysisResult | null
  isLoading: boolean
  error: string | null
  activeLayer: 'satellite' | 'ndvi' | 'rgb'
  setAnalysis: (analysis: AnalysisResult) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setActiveLayer: (layer: 'satellite' | 'ndvi' | 'rgb') => void
  reset: () => void
}

export const useLandStore = create<LandStore>((set: StoreApi<LandStore>['setState']) => ({
  analysis: null,
  isLoading: false,
  error: null,
  activeLayer: 'satellite',
  setAnalysis: (analysis: AnalysisResult) => set({ analysis, error: null }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error, isLoading: false }),
  setActiveLayer: (activeLayer: 'satellite' | 'ndvi' | 'rgb') => set({ activeLayer }),
  reset: () => set({
    analysis: null,
    isLoading: false,
    error: null,
    activeLayer: 'satellite'
  })
}))
