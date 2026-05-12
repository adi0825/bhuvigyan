interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  glow?: boolean;
}

export default function GlassBadge({
  children,
  variant = 'default',
  glow = false,
}: GlassBadgeProps) {
  const variantStyles = {
    default: 'text-slate-300 border-slate-500/30',
    success: 'text-emerald-400 border-emerald-500/30' + (glow ? ' shadow-glow-green' : ''),
    warning: 'text-amber-400 border-amber-500/30' + (glow ? ' shadow-glow' : ''),
    danger: 'text-red-400 border-red-500/30' + (glow ? ' shadow-glow-red' : ''),
    info: 'text-cyan-400 border-cyan-500/30' + (glow ? ' shadow-glow' : ''),
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}