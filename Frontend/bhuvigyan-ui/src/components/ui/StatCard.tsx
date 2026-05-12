import React from 'react';
import { LucideIcon } from 'lucide-react';
import GovCard from './GovCard';
import SkeletonLoader from './SkeletonLoader';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
    label: string;
  };
  color?: 'green' | 'blue' | 'amber' | 'red';
  loading?: boolean;
}

export default function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  color = 'green',
  loading
}: StatCardProps) {
  if (loading) {
    return (
      <GovCard leftBorder={color} className="p-5 h-32">
        <div className="flex flex-col gap-2">
          <SkeletonLoader variant="text" width="40%" height={12} />
          <SkeletonLoader variant="text" width="60%" height={28} />
          <SkeletonLoader variant="text" width="30%" height={12} />
        </div>
      </GovCard>
    );
  }

  const colorMap = {
    green: 'bg-[#d1fae5] text-[#1a6b3c]',
    blue: 'bg-[#dbeafe] text-[#0057a8]',
    amber: 'bg-[#fef3c7] text-[#e07b00]',
    red: 'bg-[#fee2e2] text-[#c0392b]',
  };

  return (
    <GovCard leftBorder={color} className="p-5 relative group">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <h3 className="text-28px font-extrabold text-[#1a1a1a] leading-none">
            {value}
          </h3>
          {unit && <span className="text-sm font-medium text-[#9ca3af]">{unit}</span>}
        </div>
        
        {trend && (
          <div className={`text-[12px] font-semibold mt-2 flex items-center gap-1 ${trend.isUp ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
            <span>{trend.isUp ? '↑' : '↓'}</span>
            <span>{trend.value}%</span>
            <span className="text-[#9ca3af] font-normal">{trend.label}</span>
          </div>
        )}
      </div>

      <div className={`absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
    </GovCard>
  );
}