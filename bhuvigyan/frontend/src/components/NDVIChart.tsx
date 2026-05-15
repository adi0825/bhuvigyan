import {
  XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart
} from 'recharts'

interface NDVIPoint {
  date: string
  ndvi: number
  label: string
  is_anomaly?: boolean
}

interface Props {
  ndvi?: {
    mean?: number
    health_label?: string
    interpretation?: string
    scan_date?: string
    cloud_cover_pct?: number
    source?: string
    timeseries?: NDVIPoint[]
    anomaly_count?: number
    error?: string
  }
}

function NDVIGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  const color =
    value < 0.15 ? '#ef4444' :
    value < 0.30 ? '#f97316' :
    value < 0.45 ? '#eab308' :
    value < 0.65 ? '#84cc16' : '#16a34a'

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full
          -rotate-90">
          <circle cx="18" cy="18" r="15.9"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"/>
          <circle cx="18" cy="18" r="15.9"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 flex items-center
          justify-center">
          <span className="text-sm font-bold"
            style={{ color }}>
            {value.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
  return (
    <div className="bg-gray-900 border border-gray-700
      rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <div className="font-semibold">{label}</div>
      <div style={{
        color: val < 0.3 ? '#f97316' :
               val < 0.5 ? '#84cc16' : '#4ade80'
      }}>
        NDVI: {val?.toFixed(4)}
      </div>
    </div>
  )
}

export default function NDVIChart({ ndvi }: Props) {
  const mean = ndvi?.mean
  const series = ndvi?.timeseries ?? []
  const anomalies = series.filter((s) => s.is_anomaly)

  return (
    <div className="space-y-4">
      {/* Current NDVI Summary */}
      {mean !== undefined && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="font-semibold text-sm text-gray-800 mb-4">🌿 Current NDVI Analysis</div>

          <div className="flex items-start gap-6">
            <NDVIGauge value={mean} />

            <div className="flex-1 space-y-2">
              <div>
                <div className="text-xs text-gray-400">Status</div>
                <div className="font-semibold text-sm">{ndvi?.health_label ?? 'Unknown'}</div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Mean', mean],
                  ['Anomalies', ndvi?.anomaly_count ?? 0],
                  ['Cloud %', ndvi?.cloud_cover_pct ?? 0],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">{label}</div>
                    <div className="font-bold text-sm">
                      {typeof val === 'number' ? val.toFixed(3) : val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {ndvi?.scan_date && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex gap-4 flex-wrap">
              <span>📅 Scan date: <b>{ndvi.scan_date}</b></span>
              <span>☁ Cloud cover: <b>{ndvi.cloud_cover_pct}%</b></span>
              <span>🛰 Source: <b>{ndvi.source}</b></span>
            </div>
          )}
        </div>
      )}

      {/* NDVI Time Series Chart */}
      {series.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="font-semibold text-sm text-gray-800">
              📈 NDVI Time Series
              <span className="ml-2 text-xs font-normal text-gray-400">({series.length} observations)</span>
            </div>
            {anomalies.length > 0 && (
              <div className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200">
                ⚠️ {anomalies.length} anomaly(ies) detected
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(d: string) => (d ? d.slice(5) : '')} interval="preserveStartEnd" />
              <YAxis domain={[-0.1, 0.9]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => v.toFixed(1)} />
              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine y={0.45} stroke="#16a34a" strokeDasharray="4 4" label={{ value: 'Healthy', position: 'insideTopRight', fontSize: 9, fill: '#16a34a' }} />
              <ReferenceLine y={0.15} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'No veg', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />

              {anomalies.map((a) => (
                <ReferenceLine key={a.date} x={a.date} stroke="#ef4444" strokeWidth={1.5} label={{ value: '⚠', position: 'top', fontSize: 11, fill: '#ef4444' }} />
              ))}

              <Area type="monotone" dataKey="ndvi" stroke="#16a34a" strokeWidth={2} fill="url(#ndviGradient)" dot={false} activeDot={{ r: 4, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>

          {/* Anomaly list */}
          {anomalies.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detected Anomalies</div>
              {anomalies.map((a, i) => (
                <div key={i} className="text-xs rounded-lg px-3 py-2 flex items-start gap-2 bg-red-50 border border-red-200">
                  <span>🔴</span>
                  <div>
                    <span className="font-semibold">{a.date}</span> — {a.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No data fallback */}
      {mean === undefined && series.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          <div className="text-3xl mb-2">🌿</div>
          <div>NDVI data unavailable.</div>
          <div className="text-xs mt-1">Check GEE credentials in backend .env</div>
        </div>
      )}
    </div>
  )
}
