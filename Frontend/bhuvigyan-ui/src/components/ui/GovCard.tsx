import React from 'react';
import { motion } from 'framer-motion';

interface GovCardProps {
  children: React.ReactNode;
  topBorder?: 'green' | 'blue' | 'amber' | 'red' | 'orange';
  leftBorder?: 'green' | 'blue' | 'amber' | 'red';
  className?: string;
  onClick?: () => void;
}

export default function GovCard({ 
  children, 
  topBorder, 
  leftBorder, 
  className = '', 
  onClick 
}: GovCardProps) {
  const borderClasses = [
    topBorder ? `gov-card-${topBorder}` : '',
    leftBorder ? `stat-border-${leftBorder}` : ''
  ].join(' ');

  return (
    <motion.div
      whileHover={onClick ? { translateY: -2, scale: 0.995 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`gov-card ${borderClasses} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </motion.div>
  );
}
