import React from 'react';
import { LucideIcon } from 'lucide-react';
import GovButton from './GovButton';
import GovCard from './GovCard';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action
}: EmptyStateProps) {
  return (
    <GovCard className="p-12 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-[#f0fdf4] flex items-center justify-center mb-6">
        <Icon size={32} className="text-[#1a6b3c]" />
      </div>
      <h3 className="text-[18px] font-bold text-[#1a1a1a] mb-2">{title}</h3>
      <p className="text-[14px] text-[#6b7280] max-w-xs mx-auto mb-8 leading-relaxed">
        {message}
      </p>
      {action && (
        <GovButton variant="outline" onClick={action.onClick}>
          {action.label}
        </GovButton>
      )}
    </GovCard>
  );
}