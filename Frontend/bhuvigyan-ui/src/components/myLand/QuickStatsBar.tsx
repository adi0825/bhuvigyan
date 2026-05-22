import { useState } from 'react';
import { Sprout, Droplets, Radio, Wheat } from 'lucide-react';
import type { LandAnalyzeResponse } from '../../types/myLand.types';

interface Props {
  analysis: LandAnalyzeResponse | null;
  loading: boolean;
}

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: string;
  statusColor: string;
  tooltip: string;
  loading: boolean;
}

function StatChip({ icon, label, value, status, statusColor, tooltip, loading }: StatChipProps) {
  const [showTip, setShowTip] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 min-w-[140px] animate-pulse border border-gray-200 shadow-sm">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div
      className="relative bg-white rounded-xl p-4 min-w-[140px] border border-gray-200 shadow-sm hover:border-[#016B4B]/40 hover:shadow transition-all cursor-pointer"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#016B4B]">{icon}</span>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#111827]">{value}</p>
      <p className="text-xs mt-1 font-semibold" style={{ color: statusColor }}>{status}</p>

      {showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
          <p className="text-[10px] text-gray-100 font-medium">{tooltip}</p>
        </div>
      )}
    </div>
  );
}

export default function QuickStatsBar({ analysis, loading }: Props) {
  const sat = analysis?.satellite;
  const crop = analysis?.crop_analysis;

  const ndviValue = sat?.ndvi_mean != null ? sat.ndvi_mean.toFixed(2) : '—';
  const ndwiValue = sat?.ndwi_mean != null ? sat.ndwi_mean.toFixed(2) : '—';
  const sarValue = sat?.sar_vv_mean != null ? `${sat.sar_vv_mean} dB` : '—';
  const cropStatus = crop?.vegetation_status || 'Unknown';

  const ndviHealth = sat?.ndvi_mean == null ? 'No data' :
    sat.ndvi_mean >= 0.6 ? 'Healthy ✅' :
    sat.ndvi_mean >= 0.4 ? 'Moderate' :
    sat.ndvi_mean >= 0.2 ? 'Stressed' : 'Barren';

  const ndviColor = sat?.ndvi_mean == null ? '#9ca3af' :
    sat.ndvi_mean >= 0.6 ? '#4ade80' :
    sat.ndvi_mean >= 0.4 ? '#a3e635' :
    sat.ndvi_mean >= 0.2 ? '#facc15' : '#f87171';

  const ndwiHealth = sat?.ndwi_mean == null ? 'No data' :
    sat.ndwi_mean > 0.1 ? 'Irrigated ✅' :
    sat.ndwi_mean > -0.2 ? 'Moderate' : 'Dry';

  const ndwiColor = sat?.ndwi_mean == null ? '#9ca3af' :
    sat.ndwi_mean > 0.1 ? '#38bdf8' :
    sat.ndwi_mean > -0.2 ? '#facc15' : '#f87171';

  const sarHealth = sat?.sar_vv_mean == null ? 'No data' :
    sat.sar_vv_mean >= -15 ? 'Strong signal' :
    sat.sar_vv_mean >= -20 ? 'Moderate' : 'Weak / Water';

  const sarColor = sat?.sar_vv_mean == null ? '#9ca3af' :
    sat.sar_vv_mean >= -15 ? '#a3e635' :
    sat.sar_vv_mean >= -20 ? '#facc15' : '#38bdf8';

  const cropColor = crop?.fraud_risk_baseline === 'LOW' ? '#016B4B' :
    crop?.fraud_risk_baseline === 'MEDIUM' ? '#facc15' : '#ef4444';

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x">
      <StatChip
        icon={<Sprout className="w-5 h-5" />}
        label="NDVI"
        value={ndviValue}
        status={ndviHealth}
        statusColor={ndviColor}
        tooltip={sat?.ndvi_mean != null ? `NDVI ${sat.ndvi_mean.toFixed(2)} means your crop is ${ndviHealth.toLowerCase().replace(' ✅', '')}` : 'NDVI data not available'}
        loading={loading}
      />
      <StatChip
        icon={<Droplets className="w-5 h-5" />}
        label="NDWI"
        value={ndwiValue}
        status={ndwiHealth}
        statusColor={ndwiColor}
        tooltip={sat?.ndwi_mean != null ? `NDWI ${sat.ndwi_mean.toFixed(2)} indicates ${ndwiHealth.toLowerCase().replace(' ✅', '')} moisture levels` : 'NDWI data not available'}
        loading={loading}
      />
      <StatChip
        icon={<Radio className="w-5 h-5" />}
        label="SAR VV"
        value={sarValue}
        status={sarHealth}
        statusColor={sarColor}
        tooltip={sat?.sar_vv_mean != null ? `Radar backscatter ${sat.sar_vv_mean} dB — ${sarHealth}` : 'SAR data not available'}
        loading={loading}
      />
      <StatChip
        icon={<Wheat className="w-5 h-5" />}
        label="Crop Status"
        value={cropStatus}
        status={crop?.detected_season || 'Unknown'}
        statusColor={cropColor}
        tooltip={crop?.fraud_risk_reason || 'No crop classification available'}
        loading={loading}
      />
    </div>
  );
}
