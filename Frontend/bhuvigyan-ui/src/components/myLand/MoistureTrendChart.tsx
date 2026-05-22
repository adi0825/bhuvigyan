import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { LandAnalyzeResponse } from '../../types/myLand.types';

interface Props {
  analysis: LandAnalyzeResponse | null;
  verification?: any;
  loading: boolean;
}

const MONTH_OPTIONS = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '12M', value: 12 },
];

export default function MoistureTrendChart({ analysis, verification, loading }: Props) {
  const [selectedMonths, setSelectedMonths] = useState<number>(12);

  const chartData = useMemo(() => {
    const ts: any[] = verification?.ndwi_timeseries || [];
    console.log('[MoistureTrendChart] Processing data:', { tsLength: ts.length, selectedMonths, hasVerification: !!verification });
    if (ts.length > 0) {
      const sorted = [...ts].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latest = new Date(sorted[sorted.length - 1].date);
      const cutoff = new Date(latest);
      cutoff.setMonth(cutoff.getMonth() - selectedMonths);
      const filtered = sorted.filter((p: any) => new Date(p.date) >= cutoff);
      console.log('[MoistureTrendChart] Filtered timeline:', { total: ts.length, filtered: filtered.length, latestDate: latest.toISOString(), cutoffDate: cutoff.toISOString() });
      return filtered.map((p: any) => ({
        month: p.date.slice(5),
        ndwi: Number(p.ndwi_mean ?? p.ndwi ?? 0),
      }));
    }
    const currentNdwi = analysis?.satellite?.ndwi_mean;
    if (currentNdwi !== null && currentNdwi !== undefined && !isNaN(Number(currentNdwi))) {
      console.log('[MoistureTrendChart] Using single snapshot:', currentNdwi);
      return [
        { month: 'Baseline', ndwi: -0.5 },
        { month: 'Current', ndwi: Number(currentNdwi) },
      ];
    }
    console.log('[MoistureTrendChart] No data:', { verification, analysis });
    return [];
  }, [verification, analysis, selectedMonths]);

  const hasTimeline = (verification?.ndwi_timeseries?.length || 0) > 0;
  const hasData = chartData.length > 0;

  if (loading) {
    return (
      <div className="bg-[#1a3a25] rounded-xl border border-[#2d5a3d] p-4 animate-pulse">
        <div className="h-4 bg-[#2d5a3d] rounded w-1/3 mb-4" />
        <div className="h-48 bg-[#2d5a3d] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-[#1a3a25] rounded-xl border border-[#2d5a3d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Field Moisture (NDWI)</h3>
        <div className="flex gap-1">
          {MONTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                console.log('[MoistureTrendChart] Month button clicked:', opt.value);
                setSelectedMonths(opt.value);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                selectedMonths === opt.value
                  ? 'bg-[#0ea5e9] text-[#0f2318]'
                  : 'bg-[#2d5a3d] text-gray-300 hover:bg-[#3d6a4d]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="h-56 flex flex-col items-center justify-center text-gray-400">
          <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3v18h18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9l-3 3-2-2-3 3-4-4" /></svg>
          <p className="text-xs">No satellite data available</p>
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="ndwiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d5a3d" vertical={false} />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[-0.5, 0.5]} stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f2318', border: '1px solid #2d5a3d', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#0ea5e9' }}
                formatter={(value: number) => [`NDWI: ${value}`, '']}
              />
              <Area type="monotone" dataKey="ndwi" stroke="#0ea5e9" strokeWidth={2} fill="url(#ndwiGrad)" />
              <ReferenceLine y={0.1} stroke="#4ade80" strokeDasharray="4 4" />
              <ReferenceLine y={-0.1} stroke="#facc15" strokeDasharray="4 4" />
              <ReferenceLine y={-0.2} stroke="#ef4444" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> &gt;0.1 Well irrigated</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> -0.1 to 0.1 Moderate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> &lt;-0.2 Moisture stressed</span>
      </div>
    </div>
  );
}
