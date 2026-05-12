import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ClaimsDonutProps {
  data: {
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
    UNDER_REVIEW: number;
  };
  size?: number;
}

const COLORS = {
  PENDING: '#f59e0b',
  APPROVED: '#1a6b3c',
  REJECTED: '#b91c1c',
  UNDER_REVIEW: '#1e40af',
};

export default function ClaimsDonut({ data, size = 250 }: ClaimsDonutProps) {
  const chartData = Object.entries(data).map(([status, count]) => ({
    name: status,
    value: count,
    color: COLORS[status as keyof typeof COLORS],
  }));

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, color } = payload[0];
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-[#e5e7eb]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[#1a1a1a] font-bold text-xs uppercase tracking-widest">{name}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="text-[#6b7280] text-sm">Count:</span>
            <span className="text-[#1a1a1a] font-black">{value}</span>
          </div>
          <div className="flex justify-between gap-8 items-center">
            <span className="text-[#6b7280] text-sm">Share:</span>
            <span className="text-primary font-bold text-sm">{percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="90%"
            paddingAngle={4}
            dataKey="value"
            animationDuration={1500}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em]">Total</span>
        <span className="text-[32px] font-black text-[#1a1a1a] leading-none">{total}</span>
        <span className="text-[10px] font-bold text-primary mt-1">Claims</span>
      </div>
    </div>
  );
}