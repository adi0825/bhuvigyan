import { useAnalysisStore } from '../store/analysisStore'
import AdminSelector from './AdminSelector'
import LandInfoPanel from './LandInfoPanel'
import SurveyMap from './SurveyMap'
import NDVIChart from './NDVIChart'
import FraudCard from './FraudCard'
import Spinner from './ui/Spinner'
import ErrorBox from './ui/ErrorBox'

function ServiceStatusBanner({ status }: { status: Record<string, { status: string; source: string; message: string }> }) {
  const entries = Object.entries(status)
  const failed = entries.filter(([, v]) => v.status !== 'success')
  if (failed.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-2">
      <div className="text-sm font-bold text-orange-800">⚠️ Some services unavailable</div>
      <div className="space-y-1">
        {failed.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="text-orange-700 capitalize">{key.replace('_', ' ')}</span>
            <span className="text-orange-600">{val.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionSkeleton({ icon, title, lines = 3 }: { icon: string; title: string; lines?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-300">{icon}</span>
        <div className="h-4 w-32 bg-gray-200 rounded" title={title} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

function NoPolygonFallback() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <span>🗺</span>
        <span className="font-semibold text-sm text-gray-800">Survey Polygon Map</span>
      </div>
      <div className="h-80 md:h-96 flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <div className="text-4xl mb-3">📍</div>
          <div className="text-sm text-gray-500 font-semibold">Polygon not available</div>
          <div className="text-xs text-gray-400 mt-2 max-w-xs">KGIS could not retrieve the parcel boundary. Showing administrative data only.</div>
        </div>
      </div>
    </div>
  )
}

function NoNDVIFallback({ error }: { error?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <div className="text-3xl mb-3">🌿</div>
      <div className="text-sm text-gray-500 font-semibold">Satellite analysis unavailable</div>
      <div className="text-xs text-gray-400 mt-2">{error || 'Check GEE credentials in backend .env'}</div>
    </div>
  )
}

function AreaComparison({ record, poly }: { record?: any; poly?: any }) {
  const recordedHa = record?.area_hectares
  const computedHa = poly?.area_ha_computed
  if (recordedHa === undefined && computedHa === undefined) return null

  let diffText = ''
  let diffColor = 'text-green-600'
  if (recordedHa !== undefined && computedHa !== undefined && recordedHa > 0) {
    const diff = Math.abs(computedHa - recordedHa)
    const pct = (diff / recordedHa) * 100
    diffText = `${diff.toFixed(4)} Ha (${pct.toFixed(1)}%)`
    diffColor = pct > 10 ? 'text-red-600' : pct > 5 ? 'text-yellow-600' : 'text-green-600'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span>📐</span>
        <span className="font-semibold text-sm text-gray-800">Area Comparison</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xs text-blue-400">Recorded (Bhoomi)</div>
          <div className="font-bold text-sm text-blue-700">{recordedHa !== undefined ? `${recordedHa.toFixed(4)} Ha` : 'N/A'}</div>
          {record?.area_acres !== undefined && <div className="text-xs text-blue-400">{record.area_acres.toFixed(4)} acres</div>}
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <div className="text-xs text-green-400">Computed (KGIS)</div>
          <div className="font-bold text-sm text-green-700">{computedHa !== undefined ? `${computedHa.toFixed(4)} Ha` : 'N/A'}</div>
        </div>
      </div>
      {diffText && (
        <div className={`mt-3 text-center text-xs font-semibold ${diffColor}`}>
          Difference: {diffText}
        </div>
      )}
    </div>
  )
}

export default function AnalysisDashboard() {
  const { analysis, isLoading, error, reset } = useAnalysisStore()

  const data = analysis?.data
  const polygon = data?.polygon
  const ndvi = data?.ndvi
  const fraud = data?.fraud
  const landRecord = data?.land_record
  const serviceStatus = data?.service_status

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="text-2xl">🛰</div>
          <div>
            <div className="font-black text-gray-900 text-base leading-tight">Bhuvigyan</div>
            <div className="text-xs text-gray-400 leading-tight">Agricultural Land Intelligence · Bhoomi × KGIS × Sentinel-2</div>
          </div>
          <div className="ml-auto flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Bhoomi</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">KGIS KSRSAC</span>
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">GEE Sentinel-2</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Selector + Info + Fraud */}
          <div className="space-y-5">
            <AdminSelector />

            {isLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <div className="text-sm text-gray-500 text-center">
                  <div className="font-semibold mb-1">Analyzing land parcel...</div>
                  <div className="text-xs text-gray-400">
                    1. Bhoomi RTC fetch<br />
                    2. KGIS polygon retrieval<br />
                    3. Sentinel-2 NDVI computation<br />
                    4. Fraud score generation
                  </div>
                </div>
              </div>
            )}

            {error && !isLoading && (
              <ErrorBox
                message={error}
                hint="Check that the backend is running on port 8000 and that Redis is available."
                onRetry={reset}
              />
            )}

            {analysis?.success && serviceStatus && (
              <ServiceStatusBanner status={serviceStatus} />
            )}

            {analysis?.success && landRecord && (
              <LandInfoPanel analysis={analysis} />
            )}

            {analysis?.success && (
              fraud ? <FraudCard fraud={fraud} /> : (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-center text-sm text-gray-400">
                  Risk assessment unavailable
                </div>
              )
            )}
          </div>

          {/* RIGHT: Map + NDVI + Area */}
          <div className="lg:col-span-2 space-y-5">
            {/* Initial empty state */}
            {!analysis && !isLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="h-80 md:h-96 flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                  <div className="text-center">
                    <div className="text-5xl mb-3">🗺</div>
                    <div className="text-gray-500 font-semibold">Select a land parcel to analyze</div>
                    <div className="text-xs text-gray-400 mt-2">District → Taluk → Hobli → Village → Survey Number</div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading skeletons for right column */}
            {isLoading && (
              <>
                <SectionSkeleton icon="🗺" title="Survey Polygon Map" lines={2} />
                <SectionSkeleton icon="📐" title="Area Comparison" lines={2} />
                <SectionSkeleton icon="🌿" title="NDVI Analysis" lines={4} />
              </>
            )}

            {/* Map: success or fallback */}
            {!isLoading && analysis?.success && (
              <>
                {polygon?.found && polygon.geojson ? (
                  <SurveyMap
                    geojson={polygon.geojson}
                    centroid={[polygon.centroid_lat ?? 0, polygon.centroid_lng ?? 0]}
                    areaHa={polygon.area_ha_computed}
                  />
                ) : (
                  <NoPolygonFallback />
                )}

                {/* Area Comparison */}
                <AreaComparison record={landRecord} poly={polygon} />

                {/* NDVI: success or fallback */}
                {ndvi ? (
                  <NDVIChart
                    ndvi={{
                      mean: ndvi.mean ?? 0,
                      health_label: ndvi.health_label ?? 'Unknown',
                      interpretation: ndvi.interpretation ?? '',
                      scan_date: ndvi.scan_date ?? '',
                      cloud_cover_pct: ndvi.cloud_cover_pct ?? 0,
                      source: ndvi.source ?? '',
                      timeseries: ndvi.timeseries ?? [],
                      anomaly_count: ndvi.anomaly_count ?? 0,
                      error: ndvi.error,
                    }}
                  />
                ) : (
                  <NoNDVIFallback error={ndvi?.error} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
