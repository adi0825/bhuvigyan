import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CountUpNumber from './CountUpNumber';

interface CarbonProgressRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function CarbonProgressRing({
  score,
  size = 120,
  strokeWidth = 8,
}: CarbonProgressRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a6b3c"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUpNumber
          end={score}
          duration={1500}
          className="text-[20px] font-black text-[#1a1a1a]"
        />
        <span className="text-[9px] font-bold text-[#9ca3af] uppercase tracking-widest mt-[-2px]">Score</span>
      </div>
    </div>
  );
}