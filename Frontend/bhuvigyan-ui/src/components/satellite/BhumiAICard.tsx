import { Leaf, Droplets, Waves, Flame, RefreshCw, Satellite, AlertTriangle, ShieldAlert } from 'lucide-react';
import GovCard from '../ui/GovCard';
import type { SatelliteData } from '../../api/satellite';

interface Props {
  data: SatelliteData | null;
  loading: boolean;
  isCached?: boolean;
  onRefresh?: () => void;
}

function getNdviColor(value: number): string {
  if (value < 0.35) return '#ef4444';
  if (value < 0.5) return '#f59e0b';
  return '#22c55e';
}

function getNdviBg(value: number): string {
  if (value < 0.35) return '#fef2f2';
  if (value < 0.5) return '#fffbeb';
  return '#f0fdf4';
}

function confidenceBadge(conf: number): { text: string; color: string; bg: string } {
  if (conf >= 0.75) return { text: 'High confidence', color: '#15803d', bg: '#dcfce7' };
  if (conf >= 0.5) return { text: 'Medium confidence', color: '#b45309', bg: '#fef3c7' };
  return { text: 'Low confidence', color: '#b91c1c', bg: '#fee2e2' };
}

export default function BhumiAICard({ data, loading, isCached, onRefresh }: Props) {
  if (loading) {
    return (
      <GovCard className="space-y-4">
        <div className="h-6 w-1/3 skeleton rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-12 w-12 skeleton rounded-full" />
              <div className="h-4 w-20 skeleton rounded" />
              <div className="h-3 w-12 skeleton rounded" />
            </div>
          ))}
        </div>
      </GovCard>
    );
  }

  if (!data) {
    return (
      <GovCard className="text-center py-8">
        <Satellite className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
        <p className="text-[#6b7280]">Satellite data unavailable</p>
      </GovCard>
    );
  }

  const ndvi = (data.ndvi || {}) as any;
  const ndwi = (data.ndwi || {}) as any;
  const flood = (data.floodRisk || data.sar_flood || {}) as any;
  const fire = (data.fire || {}) as any;
  const ndviValue = ndvi.ndvi ?? 0;
  const ndviColor = getNdviColor(ndviValue);
  const ndviBg = getNdviBg(ndviValue);

  // Conservative labels: never hard "Yes/No" without confidence context
  const floodDetected = flood.flood_detected ?? false;
  const floodConfidence = typeof flood.confidence === 'number' ? flood.confidence : 0;
  const floodLabel = floodDetected
    ? (floodConfidence < 0.5 ? 'Possible flood signal' : 'Flood risk detected')
    : 'No strong flood evidence';

  const overallConf = data.analysisConfidence ?? 0;
  const confBadge = confidenceBadge(overallConf);
  const warnings = data.qualityWarnings || [];
  const reviewNeeded = data.manualReviewRequired ?? false;

  const items = [
    {
      icon: Leaf,
      label: 'NDVI',
      value: typeof ndviValue === 'number' ? ndviValue.toFixed(2) : 'N/A',
      sub: ndvi.health_label || 'Unknown',
      color: ndviColor,
      bg: ndviBg,
    },
    {
      icon: Droplets,
      label: 'NDWI',
      value: typeof ndwi.ndwi === 'number' ? ndwi.ndwi.toFixed(2) : 'N/A',
      sub: ndwi.moisture_status || ndwi.label || 'Unknown',
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      icon: Waves,
      label: 'Flood Risk',
      value: floodLabel,
      sub: typeof flood.confidence === 'number' ? `${Math.round(flood.confidence * 100)}% confidence` : (flood.reason || 'No data'),
      color: floodDetected ? '#ef4444' : '#22c55e',
      bg: floodDetected ? '#fef2f2' : '#f0fdf4',
    },
    {
      icon: Flame,
      label: 'Fire Alerts',
      value: fire.detected ? `${fire.hotspot_count ?? 0}` : '0',
      sub: fire.detected ? `${Math.round(fire.closest_distance_km ?? 0)}km away` : 'Clear',
      color: fire.detected ? '#ef4444' : '#22c55e',
      bg: fire.detected ? '#fef2f2' : '#f0fdf4',
    },
  ];

  return (
    <GovCard className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Bhumi AI — Live Satellite</h3>
          <p className="text-xs text-[#6b7280]">
            {ndvi.source || 'Sentinel-2'} · Scan: {ndvi.scan_date || 'N/A'}
            {isCached && <span className="ml-1 text-[#f59e0b]">(cached)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ color: confBadge.color, backgroundColor: confBadge.bg }}
          >
            {confBadge.text}
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg hover:bg-[#f3f4f6] transition-colors"
              title="Refresh satellite data"
            >
              <RefreshCw className="w-4 h-4 text-[#6b7280]" />
            </button>
          )}
        </div>
      </div>

      {/* Review banner */}
      {reviewNeeded && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <b>Needs manual review</b> — satellite signals do not fully agree. Please verify before acting.
          </p>
        </div>
      )}

      {/* Quality warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-700">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 border border-[#e5e7eb]"
            style={{ backgroundColor: item.bg }}
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-[11px] font-semibold text-[#6b7280] uppercase">{item.label}</span>
            </div>
            <p className="text-lg font-bold leading-tight" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-[11px] text-[#6b7280] mt-1">{item.sub}</p>
          </div>
        ))}
      </div>
    </GovCard>
  );
}
