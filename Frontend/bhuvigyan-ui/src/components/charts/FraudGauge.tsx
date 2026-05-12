import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';
import CountUpNumber from '../ui/CountUpNumber';

interface FraudGaugeProps {
  score: number;
  size?: number;
}

export default function FraudGauge({ score, size = 200 }: FraudGaugeProps) {
  const getColor = (s: number) => {
    if (s < 30) return '#1a6b3c';
    if (s < 60) return '#f59e0b';
    return '#b91c1c';
  };

  const data = [
    { name: 'score', value: score, fill: getColor(score) },
  ];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="75%"
          outerRadius="95%"
          barSize={12}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background={{ fill: '#f3f4f6' }}
            dataKey="value"
            cornerRadius={10}
            animationDuration={1500}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <CountUpNumber
          end={score}
          duration={1500}
          className={clsx(
            'text-[36px] font-black',
            score < 30 && 'text-[#1a6b3c]',
            score >= 30 && score < 60 && 'text-[#d97706]',
            score >= 60 && 'text-[#b91c1c]'
          )}
        />
        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] -mt-1">
          Risk Index
        </span>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 text-[10px] font-bold text-[#9ca3af]">
        <span>SAFE</span>
        <span>HIGH RISK</span>
      </div>
    </div>
  );
}