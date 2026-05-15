import { useState, type FormEvent } from 'react'
import { useLandStore } from '../store/landStore'
import type { LandStore } from '../store/landStore'
import { fetchSurveyPolygon } from '../api/land'
import { computeNDVI, computeNDVITimeseries } from '../api/ndvi'
import { apiClient } from '../api/client'
import toast from 'react-hot-toast'

const CROP_OPTIONS = [
  'Paddy', 'Ragi', 'Jowar', 'Maize',
  'Sugarcane', 'Cotton', 'Groundnut',
  'Sunflower', 'Chilli', 'Turmeric',
  'Onion', 'Tomato', 'Other'
]

export default function LandSearch() {
  const [villageId, setVillageId] = useState('')
  const [surveyNumber, setSurveyNumber] = useState('')
  const [claimedAreaHa, setClaimedAreaHa] = useState('')
  const [claimedCrop, setClaimedCrop] = useState('')
  const { setAnalysis, setLoading, setError, reset } = useLandStore()
  const isLoading = useLandStore((s: LandStore) => s.isLoading)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!villageId.trim() || !surveyNumber.trim()) {
      toast.error('Village ID and Survey Number are required')
      return
    }
    reset()
    setLoading(true)

    try {
      // Step 1: Fetch polygon from KGIS
      const polygon = await fetchSurveyPolygon(
        villageId.trim(),
        surveyNumber.trim()
      )

      if (!polygon.found) {
        setError(polygon.error || 'Polygon not found')
        setAnalysis({ polygon })
        return
      }

      // Step 2 + 3: Compute NDVI and timeseries in parallel
      const geojson = polygon.geojson_feature?.geometry
      let ndvi = null
      let timeseries = null

      if (geojson) {
        const [ndviResult, tsResult] = await Promise.all([
          computeNDVI(geojson, surveyNumber.trim(), 1),
          computeNDVITimeseries(geojson, surveyNumber.trim(), 12)
        ])
        ndvi = ndviResult
        timeseries = tsResult
      }

      // Step 4: Fraud score
      const { data: fraud } = await apiClient.post('/fraud/score', {
        ndvi_data: ndvi || {},
        timeseries_data: timeseries || {},
        polygon_data: polygon,
        claimed_area_ha: claimedAreaHa ? parseFloat(claimedAreaHa) : null,
        claimed_crop: claimedCrop || null
      })

      setAnalysis({
        polygon,
        ndvi: ndvi || undefined,
        timeseries: timeseries || undefined,
        fraud
      })

      toast.success('Analysis complete')
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Analysis failed. Check backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border
      border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🛰</span>
        <div>
          <div className="font-bold text-sm text-gray-900">
            Parcel Search
          </div>
          <div className="text-xs text-gray-400">
            KGIS Village ID + Survey Number
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Required fields */}
        <div className="grid grid-cols-1 md:grid-cols-2
          gap-4">
          <div>
            <label className="block text-xs font-semibold
              text-gray-500 uppercase tracking-wide mb-1.5">
              KGIS Village ID *
            </label>
            <input
              value={villageId}
              onChange={e => setVillageId(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full border border-gray-300
                rounded-xl px-4 py-2.5 text-sm
                focus:ring-2 focus:ring-green-500
                focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold
              text-gray-500 uppercase tracking-wide mb-1.5">
              Survey Number *
            </label>
            <input
              value={surveyNumber}
              onChange={e => setSurveyNumber(e.target.value)}
              placeholder="e.g. 282"
              className="w-full border border-gray-300
                rounded-xl px-4 py-2.5 text-sm
                focus:ring-2 focus:ring-green-500
                focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Row 2: Optional verification fields */}
        <div className="grid grid-cols-1 md:grid-cols-2
          gap-4">
          <div>
            <label className="block text-xs font-semibold
              text-gray-500 uppercase tracking-wide mb-1.5">
              Claimed Area (Ha) — optional
            </label>
            <input
              type="number"
              step="0.01"
              value={claimedAreaHa}
              onChange={e =>
                setClaimedAreaHa(e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full border border-gray-300
                rounded-xl px-4 py-2.5 text-sm
                focus:ring-2 focus:ring-green-500
                focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold
              text-gray-500 uppercase tracking-wide mb-1.5">
              Claimed Crop — optional
            </label>
            <select
              value={claimedCrop}
              onChange={e => setClaimedCrop(e.target.value)}
              className="w-full border border-gray-300
                rounded-xl px-4 py-2.5 text-sm bg-white
                focus:ring-2 focus:ring-green-500
                focus:border-transparent outline-none">
              <option value="">Select crop</option>
              {CROP_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-green-700 text-white
            rounded-xl py-3 font-semibold text-sm
            hover:bg-green-800 transition-colors
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4"
                viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analyzing — fetching satellite data...
            </>
          ) : (
            '🛰 Analyze Land Parcel'
          )}
        </button>

        {isLoading && (
          <div className="text-xs text-gray-400
            text-center space-y-1">
            <div>
              Step 1/3: Fetching KGIS polygon...
            </div>
            <div>
              Step 2/3: Computing NDVI via GEE...
            </div>
            <div>
              Step 3/3: Running fraud detection...
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
