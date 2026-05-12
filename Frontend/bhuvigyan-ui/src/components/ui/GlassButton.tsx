import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface GovButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'blue' | 'danger' | 'ghost' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export default function GovButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className,
  fullWidth = false,
}: GovButtonProps) {
  const variantStyles = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    blue: 'btn-blue',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    warning: 'bg-warning text-white border-none rounded-lg px-5 py-2.5 font-semibold text-sm cursor-pointer',
  };

  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3',
    md: 'text-sm py-2.5 px-5',
    lg: 'text-base py-3 px-6',
  };

  return (
    <motion.button
      type={type}
      className={clsx(
        'rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {loading ? 'Please wait...' : children}
    </motion.button>
  );
}

export { GovButton as GlassButton };