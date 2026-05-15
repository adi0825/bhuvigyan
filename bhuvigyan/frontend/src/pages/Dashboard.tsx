import LandSearch from '../components/LandSearch'
import SurveyMap from '../components/SurveyMap'
import NDVIChart from '../components/NDVIChart'
import FraudCard from '../components/FraudCard'
import LandInfoCard from '../components/LandInfoCard'
import ErrorBox from '../components/ui/ErrorBox'
import Spinner from '../components/ui/Spinner'
import { useLandStore } from '../store/landStore'

export default function Dashboard() {
  const {
    analysis,
    isLoading,
    error,
    reset
  } = useLandStore()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200
        sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3
          flex items-center gap-3">
          <div className="text-2xl">🛰</div>
          <div>
            <div className="font-black text-gray-900
              text-base leading-tight">
              Bhuvigyan
            </div>
            <div className="text-xs text-gray-400
              leading-tight">
              Agricultural Fraud Detection · KGIS ×
              Sentinel-2
            </div>
          </div>
          <div className="ml-auto flex gap-2 text-xs">
            <span className="bg-green-100 text-green-700
              px-2 py-1 rounded-full font-semibold">
              KGIS KSRSAC
            </span>
            <span className="bg-blue-100 text-blue-700
              px-2 py-1 rounded-full font-semibold">
              GEE Sentinel-2
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3
          gap-6">

          {/* LEFT: Search + Info + Fraud */}
          <div className="space-y-5">
            <LandSearch />

            {/* Loading */}
            {isLoading && (
              <div className="bg-white rounded-2xl
                border border-gray-200 p-8
                flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <div className="text-sm text-gray-500
                  text-center">
                  <div className="font-semibold mb-1">
                    Analyzing land parcel...
                  </div>
                  <div className="text-xs text-gray-400">
                    1. KGIS polygon fetch<br/>
                    2. Sentinel-2 NDVI compute<br/>
                    3. 12-month time series<br/>
                    4. Fraud score generation
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <ErrorBox
                message={error}
                hint={
                  error.includes('port') ||
                  error.includes('9000')
                    ? 'KGIS port 9000 may be blocked ' +
                      'on your network. Try mobile ' +
                      'hotspot or VPN.'
                    : error.includes('GEE') ||
                      error.includes('Earth Engine')
                    ? 'Check GEE_SERVICE_ACCOUNT_KEY ' +
                      'and GEE_PROJECT_ID in backend/.env'
                    : 'Check backend logs for details.'
                }
                onRetry={reset}
              />
            )}

            {/* Parcel Info */}
            {analysis?.polygon && (
              <LandInfoCard
                polygon={analysis.polygon}
                ndvi={analysis.ndvi}
              />
            )}

            {/* Fraud */}
            {analysis?.fraud && (
              <FraudCard fraud={analysis.fraud} />
            )}
          </div>

          {/* RIGHT: Map + Charts */}
          <div className="lg:col-span-2 space-y-5">

            {/* Map placeholder */}
            {!analysis && !isLoading && (
              <div className="bg-white rounded-2xl
                border border-gray-200 overflow-hidden">
                <div className="h-96 flex items-center
                  justify-center bg-gradient-to-br
                  from-green-50 to-blue-50">
                  <div className="text-center">
                    <div className="text-5xl mb-3">
                      🗺
                    </div>
                    <div className="text-gray-500
                      font-semibold">
                      Enter a village ID and survey
                      number to analyze
                    </div>
                    <div className="text-xs text-gray-400
                      mt-2">
                      Polygon boundary, NDVI overlay,
                      and fraud score will appear here
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Map */}
            {analysis?.polygon?.found && (
              <SurveyMap
                polygon={analysis.polygon}
                ndvi={analysis.ndvi}
              />
            )}

            {/* Polygon not found */}
            {analysis?.polygon &&
             !analysis.polygon.found && (
              <ErrorBox
                message={
                  analysis.polygon.error ??
                  'Polygon not found'
                }
                hint={
                  'If KGIS port 9000 is blocked, ' +
                  'the polygon cannot be rendered. ' +
                  'Try a different network.'
                }
              />
            )}

            {/* NDVI Charts */}
            {analysis && (
              <NDVIChart
                ndvi={analysis.ndvi}
                timeseries={analysis.timeseries}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
