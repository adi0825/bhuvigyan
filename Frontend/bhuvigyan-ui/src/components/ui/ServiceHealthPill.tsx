import { clsx } from 'clsx';

interface ServiceHealthPillProps {
  name: string;
  port: number;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  responseTime: number;
  lastChecked: string;
}

export default function ServiceHealthPill({
  name,
  port,
  status,
  responseTime,
  lastChecked,
}: ServiceHealthPillProps) {
  const statusColors = {
    UP: 'text-[#16a34a]',
    DOWN: 'text-[#dc2626]',
    UNKNOWN: 'text-[#9ca3af]',
  };

  const dotColors = {
    UP: 'bg-[#16a34a]',
    DOWN: 'bg-[#dc2626]',
    UNKNOWN: 'bg-[#9ca3af]',
  };

  const responseTimeColor =
    responseTime < 100
      ? 'text-[#16a34a]'
      : responseTime < 500
      ? 'text-[#d97706]'
      : 'text-[#dc2626]';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#e5e7eb] rounded-full text-sm shadow-sm">
      <div className="relative">
        <span className={clsx('w-2 h-2 rounded-full', dotColors[status], status === 'UP' && 'animate-pulse')} />
      </div>
      <span className="font-medium text-[#1a1a1a]">{name}</span>
      <span className="text-[#9ca3af]">:{port}</span>
      {status !== 'UNKNOWN' && (
        <span className={clsx('font-mono text-xs', responseTimeColor)}>
          {responseTime}ms
        </span>
      )}
      <span className="text-[#6b7280] text-xs">
        {status === 'UP' ? 'UP' : status === 'DOWN' ? 'DOWN' : 'UNKNOWN'}
      </span>
    </div>
  );
}