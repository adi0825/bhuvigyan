import React from 'react';

interface FraudScoreBarProps {
  score: number;
  showLabel?: boolean;
}

export default function FraudScoreBar({ score, showLabel = true }: FraudScoreBarProps) {
  const getRiskLevel = (s: number) => {
    if (s <= 30) return 'low';
    if (s <= 70) return 'medium';
    return 'high';
  };

  const risk = getRiskLevel(score);
  
  const colors = {
    low: 'bg-[#16a34a]',
    medium: 'bg-[#d97706]',
    high: 'bg-[#dc2626]'
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">Fraud Risk Score</span>
          <span className={`text-[13px] font-bold ${risk === 'low' ? 'text-[#16a34a]' : risk === 'medium' ? 'text-[#d97706]' : 'text-[#dc2626]'}`}>
            {score} / 100
          </span>
        </div>
      )}
      <div className="fraud-bar-wrap">
        <div 
          className={`fraud-bar-fill ${risk === 'low' ? 'fraud-low' : risk === 'medium' ? 'fraud-medium' : 'fraud-high'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}