import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { clsx } from 'clsx';

interface NdviChartProps {
  data: { month: string; ndvi: number }[];
  height?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const ndvi = payload[0].value;
    const status =
      ndvi < 0.35
        ? 'Stressed'
        : ndvi < 0.6
        ? 'Moderate'
        : 'Healthy';
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-[#e5e7eb]">
        <p className="text-[#1a1a1a] font-bold text-xs mb-2 uppercase tracking-widest">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-8 items-center">
            <span className="text-[#6b7280] text-sm">NDVI Index:</span>
            <span className="text-[#1a1a1a] font-black">{ndvi.toFixed(3)}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="text-[#6b7280] text-sm">Status:</span>
            <span
              className={clsx(
                'font-bold text-xs px-2 py-0.5 rounded-full',
                status === 'Healthy' && 'bg-[#f0fdf4] text-[#1a6b3c]',
                status === 'Moderate' && 'bg-[#fffbeb] text-[#d97706]',
                status === 'Stressed' && 'bg-[#fef2f2] text-[#b91c1c]'
              )}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function NdviChart({ data, height = 250 }: NdviChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1a6b3c" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#1a6b3c" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="month"
          stroke="#9ca3af"
          fontSize={10}
          fontWeight={600}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          domain={[0, 1]}
          stroke="#9ca3af"
          fontSize={10}
          fontWeight={600}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1a6b3c', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <ReferenceLine
          y={0.35}
          stroke="#ef4444"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{ 
            value: 'Stress Threshold', 
            fill: '#ef4444', 
            fontSize: 10, 
            fontWeight: 700,
            position: 'insideBottomRight',
            dy: -5
          }}
        />
        <Area
          type="monotone"
          dataKey="ndvi"
          stroke="#1a6b3c"
          strokeWidth={3}
          fill="url(#ndviGradient)"
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}