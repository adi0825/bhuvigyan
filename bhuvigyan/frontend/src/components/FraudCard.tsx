interface FraudFactor {
  factor: string
  severity: string
  weight: number
  detail: string
}

interface FraudData {
  fraud_score: number
  band: 'CLEAN' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK'
  recommendation: string
  factors: FraudFactor[]
}

interface Props {
  fraud: FraudData
}

const BAND_CONFIG = {
  CLEAN: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    bar: 'bg-green-500',
    text: 'text-green-700',
    icon: '✅',
    label: 'CLEAN'
  },
  LOW_RISK: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    bar: 'bg-yellow-400',
    text: 'text-yellow-700',
    icon: '🟡',
    label: 'LOW RISK'
  },
  MEDIUM_RISK: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    bar: 'bg-orange-500',
    text: 'text-orange-700',
    icon: '🟠',
    label: 'MEDIUM RISK'
  },
  HIGH_RISK: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    bar: 'bg-red-600',
    text: 'text-red-700',
    icon: '🔴',
    label: 'HIGH RISK'
  }
}

const SEVERITY_ICON: Record<string, string> = {
  critical: '🔴',
  high: '🔴',
  medium: '🟠',
  low: '🟡'
}

const FACTOR_LABELS: Record<string, string> = {
  vegetation_anomaly: 'No Vegetation Detected',
  low_vegetation: 'Low Vegetation',
  moderate_vegetation: 'Below-Threshold Vegetation',
  temporal_anomaly: 'Temporal NDVI Anomaly',
  uniform_ndvi: 'Suspiciously Uniform NDVI',
  area_mismatch: 'Area Mismatch',
  flood_signal: 'Flood / Waterlogging Signal'
}

export default function FraudCard({ fraud }: Props) {
  const cfg = BAND_CONFIG[fraud.band] ?? BAND_CONFIG.CLEAN
  const score = fraud.fraud_score

  return (
    <div className={`rounded-2xl border p-5
      ${cfg.bg} ${cfg.border}`}>

      {/* Header */}
      <div className="flex items-center
        justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.icon}</span>
          <div>
            <div className="font-bold text-sm">
              Fraud Risk Assessment
            </div>
            <div className={`text-xs font-semibold
              ${cfg.text}`}>
              {cfg.label}
            </div>
          </div>
        </div>

        {/* Score circle */}
        <div className={`w-16 h-16 rounded-full
          flex items-center justify-center
          border-4 ${cfg.border}`}>
          <div>
            <div className={`text-xl font-black
              leading-none ${cfg.text}`}>
              {score.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400
              text-center">
              /100
            </div>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs
          text-gray-500 mb-1">
          <span>Fraud Probability Score</span>
          <span className={`font-bold ${cfg.text}`}>
            {score.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-white rounded-full
          overflow-hidden border border-gray-200">
          <div
            className={`h-full rounded-full
              transition-all duration-700 ${cfg.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between text-xs
          text-gray-400 mt-1">
          <span>0 — Clean</span>
          <span>50 — Medium</span>
          <span>100 — Fraud</span>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-white rounded-xl px-4 py-3
        mb-4 border border-gray-100 text-sm
        text-gray-700">
        💡 {fraud.recommendation}
      </div>

      {/* Risk factors */}
      {fraud.factors.length > 0 && (
        <div>
          <div className="text-xs font-semibold
            text-gray-500 uppercase tracking-wide mb-2">
            Risk Factors ({fraud.factors.length})
          </div>
          <div className="space-y-2">
            {fraud.factors.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl px-4 py-3
                  border border-gray-100"
              >
                <div className="flex items-center
                  justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>
                      {SEVERITY_ICON[f.severity] ?? '⚪'}
                    </span>
                    <span className="text-xs font-semibold
                      text-gray-800">
                      {FACTOR_LABELS[f.factor] ?? f.factor}
                    </span>
                  </div>
                  <span className="text-xs font-bold
                    text-gray-500">
                    +{f.weight} pts
                  </span>
                </div>
                <p className="text-xs text-gray-600 ml-5">
                  {f.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {fraud.factors.length === 0 && (
        <div className="text-xs text-green-700
          text-center py-2">
          No fraud signals detected. Claim appears clean.
        </div>
      )}
    </div>
  )
}
