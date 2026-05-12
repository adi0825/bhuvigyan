import { Leaf, Droplets, Waves, Flame, RefreshCw, Satellite } from 'lucide-react';
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

  const ndvi = data.ndvi;
  const ndwi = data.ndwi;
  const flood = data.sar_flood;
  const fire = data.fire;
  const ndviColor = getNdviColor(ndvi.ndvi);
  const ndviBg = getNdviBg(ndvi.ndvi);

  const items = [
    {
      icon: Leaf,
      label: 'NDVI',
      value: ndvi.ndvi.toFixed(2),
      sub: ndvi.health_label,
      color: ndviColor,
      bg: ndviBg,
    },
    {
      icon: Droplets,
      label: 'NDWI',
      value: ndwi.ndwi.toFixed(2),
      sub: ndwi.moisture_status,
      color: '#2563eb',
      bg: '#eff6ff',
    },
    {
      icon: Waves,
      label: 'Flood Risk',
      value: flood.flood_detected ? 'Yes' : 'No',
      sub: `${Math.round(flood.confidence * 100)}% confidence`,
      color: flood.flood_detected ? '#ef4444' : '#22c55e',
      bg: flood.flood_detected ? '#fef2f2' : '#f0fdf4',
    },
    {
      icon: Flame,
      label: 'Fire Alerts',
      value: fire.detected ? `${fire.hotspot_count}` : '0',
      sub: fire.detected ? `${Math.round(fire.closest_distance_km)}km away` : 'Clear',
      color: fire.detected ? '#ef4444' : '#22c55e',
      bg: fire.detected ? '#fef2f2' : '#f0fdf4',
    },
  ];

  return (
    <GovCard className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">Bhumi AI — Live Satellite</h3>
          <p className="text-xs text-[#6b7280]">
            {ndvi.source} · Scan: {ndvi.scan_date}
            {isCached && <span className="ml-1 text-[#f59e0b]">(cached)</span>}
          </p>
        </div>
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
            <p className="text-xl font-bold" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-[11px] text-[#6b7280]">{item.sub}</p>
          </div>
        ))}
      </div>
    </GovCard>
  );
}
