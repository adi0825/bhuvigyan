import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rect' | 'circle' | 'card' | 'table';
  width?: string | number;
  height?: string | number;
  className?: string;
  rows?: number;
}

export default function SkeletonLoader({
  variant = 'text',
  width,
  height,
  className = '',
  rows = 1
}: SkeletonLoaderProps) {
  if (variant === 'card') {
    return (
      <div className={`gov-card p-6 space-y-4 ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full skeleton" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 skeleton" />
            <div className="h-3 w-1/4 skeleton" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full skeleton" />
          <div className="h-3 w-full skeleton" />
          <div className="h-3 w-2/3 skeleton" />
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`w-full space-y-2 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 h-12 items-center px-4 border-b border-[#f3f4f6]">
            <div className="h-4 w-1/4 skeleton" />
            <div className="h-4 w-1/4 skeleton" />
            <div className="h-4 w-1/4 skeleton" />
            <div className="h-4 w-1/4 skeleton" />
          </div>
        ))}
      </div>
    );
  }

  const baseStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
    borderRadius: variant === 'circle' ? '50%' : '8px'
  };

  return (
    <div 
      className={`skeleton ${className}`}
      style={baseStyle}
    />
  );
}