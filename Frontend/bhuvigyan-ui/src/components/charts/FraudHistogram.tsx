import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FraudDistribution } from '../../types';

interface FraudHistogramProps {
  data: FraudDistribution[];
  height?: number;
}

const getBarColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
  switch (risk) {
    case 'LOW':
      return '#1a6b3c';
    case 'MEDIUM':
      return '#f59e0b';
    case 'HIGH':
      return '#b91c1c';
  }
};

export default function FraudHistogram({ data, height = 250 }: FraudHistogramProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { count, risk } = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-[#e5e7eb]">
          <p className="text-[#1a1a1a] font-bold text-xs mb-2 uppercase tracking-widest">Score Range {label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-8 items-center">
              <span className="text-[#6b7280] text-sm">Total Claims:</span>
              <span className="text-[#1a1a1a] font-black">{count}</span>
            </div>
            <div className="flex justify-between gap-8 items-center">
              <span className="text-[#6b7280] text-sm">Risk Profile:</span>
              <span
                className={
                  risk === 'LOW'
                    ? 'text-[#1a6b3c] font-bold'
                    : risk === 'MEDIUM'
                    ? 'text-[#d97706] font-bold'
                    : 'text-[#b91c1c] font-bold'
                }
              >
                {risk}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        barGap={0}
      >
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f3f4f6" />
        <XAxis
          dataKey="range"
          stroke="#9ca3af"
          fontSize={10}
          fontWeight={600}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          stroke="#9ca3af"
          fontSize={10}
          fontWeight={600}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1500}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.risk)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}