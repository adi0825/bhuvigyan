import { useState, useEffect } from 'react'
import {
  fetchDistricts,
  fetchTaluks,
  fetchHoblis,
  fetchVillages,
  type District,
  type Taluk,
  type Hobli,
  type Village,
} from '../api/admin'
import { useAnalysisStore } from '../store/analysisStore'
import Spinner from './ui/Spinner'

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  loading,
  error,
  placeholder,
  getKey,
  getLabel,
}: {
  label: string
  value: string
  options: { name?: string; code?: string }[]
  onChange: (code: string, name: string) => void
  disabled?: boolean
  loading?: boolean
  error?: string | null
  placeholder: string
  getKey: (o: any) => string
  getLabel: (o: any) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const code = e.target.value
            const opt = options.find((o) => getKey(o) === code)
            onChange(code, opt ? getLabel(opt) : '')
          }}
          disabled={disabled || loading}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm appearance-none bg-white
            ${disabled || loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-800 border-gray-200 hover:border-green-400'}
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={getKey(o)} value={getKey(o)}>
              {getLabel(o)}
            </option>
          ))}
        </select>
        {loading && (
          <div className="absolute right-8 top-2.5">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      {error && <div className="text-xs text-red-500">{error}</div>}
    </div>
  )
}

export default function AdminSelector() {
  const {
    selection,
    isLoading,
    setDistrict,
    setTaluk,
    setHobli,
    setVillage,
    setSurveyNumber,
    setHissaNumber,
    setAnalysis,
    setLoading,
    setError,
    reset,
  } = useAnalysisStore()

  const [districts, setDistricts] = useState<District[]>([])
  const [taluks, setTaluks] = useState<Taluk[]>([])
  const [hoblis, setHoblis] = useState<Hobli[]>([])
  const [villages, setVillages] = useState<Village[]>([])

  const [loadState, setLoadState] = useState({
    districts: false,
    taluks: false,
    hoblis: false,
    villages: false,
  })
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  // Load districts on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadState((s) => ({ ...s, districts: true }))
      setErrors((e) => ({ ...e, districts: null }))
      try {
        const data = await fetchDistricts()
        if (!cancelled) setDistricts(data)
      } catch (err: any) {
        if (!cancelled) setErrors((e) => ({ ...e, districts: err.message || 'Failed to load districts' }))
      } finally {
        if (!cancelled) setLoadState((s) => ({ ...s, districts: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Load taluks when district changes
  useEffect(() => {
    if (!selection.district) {
      setTaluks([])
      return
    }
    let cancelled = false
    async function load() {
      setLoadState((s) => ({ ...s, taluks: true }))
      setErrors((e) => ({ ...e, taluks: null }))
      try {
        const data = await fetchTaluks(selection.district!.code)
        if (!cancelled) setTaluks(data)
      } catch (err: any) {
        if (!cancelled) setErrors((e) => ({ ...e, taluks: err.message || 'Failed to load taluks' }))
      } finally {
        if (!cancelled) setLoadState((s) => ({ ...s, taluks: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [selection.district])

  // Load hoblis when taluk changes
  useEffect(() => {
    if (!selection.taluk) {
      setHoblis([])
      return
    }
    let cancelled = false
    async function load() {
      setLoadState((s) => ({ ...s, hoblis: true }))
      setErrors((e) => ({ ...e, hoblis: null }))
      try {
        const data = await fetchHoblis(selection.taluk!.code)
        if (!cancelled) setHoblis(data)
      } catch (err: any) {
        if (!cancelled) setErrors((e) => ({ ...e, hoblis: err.message || 'Failed to load hoblis' }))
      } finally {
        if (!cancelled) setLoadState((s) => ({ ...s, hoblis: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [selection.taluk])

  // Load villages when hobli changes
  useEffect(() => {
    if (!selection.hobli) {
      setVillages([])
      return
    }
    let cancelled = false
    async function load() {
      setLoadState((s) => ({ ...s, villages: true }))
      setErrors((e) => ({ ...e, villages: null }))
      try {
        const data = await fetchVillages(selection.hobli!.code, selection.taluk?.name, selection.district?.name)
        if (!cancelled) setVillages(data)
      } catch (err: any) {
        if (!cancelled) setErrors((e) => ({ ...e, villages: err.message || 'Failed to load villages' }))
      } finally {
        if (!cancelled) setLoadState((s) => ({ ...s, villages: false }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [selection.hobli])

  const canAnalyze =
    selection.district &&
    selection.taluk &&
    selection.hobli &&
    selection.village &&
    selection.survey_number.trim().length > 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏛</span>
          <span className="font-bold text-sm text-gray-800">Select Land Parcel</span>
        </div>
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* State */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">State</label>
        <input
          value="Karnataka"
          disabled
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* District */}
      <SelectField
        label="District"
        value={selection.district?.code ?? ''}
        options={districts}
        onChange={(code, name) => setDistrict(code ? { name, code } : null)}
        disabled={isLoading}
        loading={loadState.districts}
        error={errors.districts}
        placeholder="Select District"
        getKey={(o) => o.code || o.DistrictCode || ''}
        getLabel={(o) => o.name || o.DistrictName || o.code || ''}
      />

      {/* Taluk */}
      <SelectField
        label="Taluk"
        value={selection.taluk?.code ?? ''}
        options={taluks}
        onChange={(code, name) => setTaluk(code ? { name, code } : null)}
        disabled={!selection.district || isLoading}
        loading={loadState.taluks}
        error={errors.taluks}
        placeholder={selection.district ? 'Select Taluk' : 'Choose District first'}
        getKey={(o) => o.code || o.TalukCode || ''}
        getLabel={(o) => o.name || o.TalukName || o.code || ''}
      />

      {/* Hobli */}
      <SelectField
        label="Hobli"
        value={selection.hobli?.code ?? ''}
        options={hoblis}
        onChange={(code, name) => setHobli(code ? { name, code } : null)}
        disabled={!selection.taluk || isLoading}
        loading={loadState.hoblis}
        error={errors.hoblis}
        placeholder={selection.taluk ? 'Select Hobli' : 'Choose Taluk first'}
        getKey={(o) => o.code || o.HobliCode || ''}
        getLabel={(o) => o.name || o.HobliName || o.code || ''}
      />

      {/* Village */}
      <SelectField
        label="Village"
        value={selection.village?.code ?? ''}
        options={villages}
        onChange={(code, name) => {
          const opt = villages.find((v) => (v.code || v.VillageCode) === code)
          setVillage(code ? { name, code, kgis_village_id: opt?.kgis_village_id } : null)
        }}
        disabled={!selection.hobli || isLoading}
        loading={loadState.villages}
        error={errors.villages}
        placeholder={selection.hobli ? 'Select Village' : 'Choose Hobli first'}
        getKey={(o) => o.code || o.VillageCode || ''}
        getLabel={(o) => o.name || o.VillageName || o.code || ''}
      />

      {/* Survey Number */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Survey Number
        </label>
        <input
          type="text"
          value={selection.survey_number}
          onChange={(e) => setSurveyNumber(e.target.value)}
          disabled={!selection.village || isLoading}
          placeholder={selection.village ? 'e.g. 45' : 'Choose Village first'}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm
            ${!selection.village || isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-green-400'}
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors`}
        />
      </div>

      {/* Hissa Number */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Hissa Number
        </label>
        <input
          type="text"
          value={selection.hissa_number}
          onChange={(e) => setHissaNumber(e.target.value)}
          disabled={!selection.village || isLoading}
          placeholder="1"
          className={`w-full rounded-xl border px-3 py-2.5 text-sm
            ${!selection.village || isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-green-400'}
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors`}
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={async () => {
          setLoading(true)
          setError(null)
          const payload = {
            district: selection.district!.name,
            taluk: selection.taluk!.name,
            hobli: selection.hobli!.name,
            village: selection.village!.name,
            survey_number: selection.survey_number.trim(),
            hissa_number: selection.hissa_number.trim() || '1',
            kgis_village_id: selection.village?.kgis_village_id || '',
            kgis_village_code: selection.village?.code || '',
            declared_crop: '',
            claimed_area_ha: null,
          }
          try {
            const { runAnalysis } = await import('../api/analysis')
            const res = await runAnalysis(payload)
            if (res.success) {
              setAnalysis(res)
            } else {
              setError(res.error?.message || 'Analysis returned unsuccessful')
            }
          } catch (err: any) {
            // Axios interceptor preserves the full error object with .parsedMessage
            const msg = err.parsedMessage || err.response?.data?.error?.message || err.message || 'Network error'
            setError(msg)
          } finally {
            setLoading(false)
          }
        }}
        disabled={!canAnalyze || isLoading}
        className={`w-full rounded-xl py-3 text-sm font-bold transition-all flex items-center justify-center gap-2
          ${canAnalyze && !isLoading
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            <span>Analyzing...</span>
          </>
        ) : (
          <span>Analyze Land Parcel</span>
        )}
      </button>
    </div>
  )
}
