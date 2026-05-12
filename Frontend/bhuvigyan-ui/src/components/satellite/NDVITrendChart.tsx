import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import GovCard from '../ui/GovCard';
import type { TimeseriesPoint } from '../../api/satellite';

interface Props {
  data: TimeseriesPoint[];
  loading?: boolean;
}

function getZone(value: number): { label: string; color: string } {
  if (value < 0.15) return { label: 'Critical', color: '#ef4444' };
  if (value < 0.30) return { label: 'Poor', color: '#f97316' };
  if (value < 0.45) return { label: 'Fair', color: '#f59e0b' };
  if (value < 0.65) return { label: 'Good', color: '#22c55e' };
  return { label: 'Excellent', color: '#16a34a' };
}

export default function NDVITrendChart({ data, loading }: Props) {
  const [showZones, setShowZones] = useState(true);

  if (loading) {
    return (
      <GovCard className="space-y-4">
        <div className="h-6 w-1/3 skeleton rounded" />
        <div className="h-64 skeleton rounded" />
      </GovCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <GovCard className="text-center py-8">
        <TrendingUp className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
        <p className="text-[#6b7280]">No NDVI trend data available</p>
      </GovCard>
    );
  }

  const current = data[data.length - 1];
  const previous = data[data.length - 2] || current;
  const change = current.ndvi - previous.ndvi;
  const zone = getZone(current.ndvi);

  return (
    <GovCard className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-[#1a1a1a]">NDVI Trend</h3>
          <p className="text-xs text-[#6b7280]">
            {data.length}-month history from Sentinel-2
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#ef4444]" />
            )}
            <span className={change >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}
            </span>
          </div>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: zone.color + '20', color: zone.color }}
          >
            {zone.label}
          </span>
          <button
            onClick={() => setShowZones(!showZones)}
            className="text-xs text-[#6b7280] underline"
          >
            {showZones ? 'Hide zones' : 'Show zones'}
          </button>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
              formatter={(value: any) => [`NDVI: ${Number(value).toFixed(3)}`, '']}
            />
            {showZones && (
              <>
                <ReferenceLine y={0.65} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Excellent', position: 'right', fontSize: 10, fill: '#22c55e' }} />
                <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Good', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                <ReferenceLine y={0.30} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'Fair', position: 'right', fontSize: 10, fill: '#f97316' }} />
                <ReferenceLine y={0.15} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical', position: 'right', fontSize: 10, fill: '#ef4444' }} />
              </>
            )}
            <Line
              type="monotone"
              dataKey="ndvi"
              stroke="#1a6b3c"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#1a6b3c', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#1a6b3c' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-[#9ca3af] text-center">
        Sentinel-2 SR Harmonized · Google Earth Engine · 10m resolution
      </p>
    </GovCard>
  );
}
