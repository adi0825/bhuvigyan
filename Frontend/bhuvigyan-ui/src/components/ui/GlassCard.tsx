import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GovCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  topBorder?: 'green' | 'blue' | 'amber' | 'red' | 'orange';
  leftBorder?: 'green' | 'blue' | 'amber' | 'red';
  hover?: boolean;
}

const topBorderMap: Record<string, string> = {
  green: 'gov-card-green',
  blue: 'gov-card-blue',
  amber: 'gov-card-amber',
  red: 'gov-card-red',
  orange: 'gov-card-orange',
};

const leftBorderMap: Record<string, string> = {
  green: 'stat-border-green',
  blue: 'stat-border-blue',
  amber: 'stat-border-amber',
  red: 'stat-border-red',
};

export default function GovCard({
  children,
  className,
  onClick,
  topBorder,
  leftBorder,
  hover = true,
}: GovCardProps) {
  return (
    <motion.div
      className={clsx(
        'gov-card p-5',
        topBorder && topBorderMap[topBorder],
        leftBorder && leftBorderMap[leftBorder],
        onClick && 'cursor-pointer',
        className
      )}
      whileHover={hover ? { scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 300 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Keep GlassCard as alias for backward compatibility
export { GovCard as GlassCard };