import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { LandAnalyzeResponse } from '../../types/myLand.types';

interface Props {
  analysis: LandAnalyzeResponse | null;
  loading: boolean;
}

interface AnomalyRowProps {
  severity: 'HIGH' | 'MED' | 'LOW';
  description: string;
  explanation: string;
}

const severityConfig = {
  HIGH: { border: 'border-red-500', bg: 'bg-red-500/10', badge: 'bg-red-500 text-white', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
  MED: { border: 'border-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500 text-black', icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
  LOW: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500 text-white', icon: <AlertTriangle className="w-4 h-4 text-emerald-400" /> },
};

function AnomalyRow({ severity, description, explanation }: AnomalyRowProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = severityConfig[severity];

  return (
    <div className={`border-l-4 ${cfg.border} ${cfg.bg} rounded-r-lg p-3`}>
      <div className="flex items-start gap-2">
        {cfg.icon}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}>{severity}</span>
            <span className="text-xs text-[#111827] font-semibold">{description}</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            What this means
          </button>
          {expanded && (
            <p className="text-[10px] text-gray-600 mt-1 pl-4 border-l border-gray-300">
              {explanation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnomalyAlertsPanel({ analysis, loading }: Props) {
  const fraud = analysis?.crop_analysis;

  const anomalies: Array<{ severity: 'HIGH' | 'MED' | 'LOW'; description: string; explanation: string }> = [];

  if (fraud?.fraud_risk_baseline === 'HIGH') {
    anomalies.push({
      severity: 'HIGH',
      description: fraud.fraud_risk_reason,
      explanation: 'High NDVI anomaly or barren land detected. This strongly suggests no active crop is present at the claimed location. Insurance claims for this field should be manually reviewed.',
    });
  }

  if (fraud?.fraud_risk_baseline === 'MEDIUM') {
    anomalies.push({
      severity: 'MED',
      description: fraud.fraud_risk_reason,
      explanation: 'Moderate vegetation stress detected. This could indicate drought, pest damage, or late/early growth stage. Cross-check with farmer-declared sowing date.',
    });
  }

  if (!analysis?.satellite?.ndvi_mean && analysis?.satellite?.source === 'unavailable') {
    anomalies.push({
      severity: 'LOW',
      description: 'Satellite data unavailable for this location',
      explanation: 'All satellite sources (GEE, CDSE, MPC) failed to return data. This may be due to network issues, cloud cover, or the location being outside recent coverage. Try again later.',
    });
  }

  if (anomalies.length === 0) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-32 shadow-sm" />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#111827] mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Field Anomalies Detected
      </h3>
      <div className="space-y-2 mt-3">
        {anomalies.map((a, i) => (
          <AnomalyRow key={i} {...a} />
        ))}
      </div>
    </div>
  );
}
