import { cn } from '@/lib/utils';

interface CPIGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const CPIGauge = ({ score, size = 'md', showLabel = true }: CPIGaugeProps) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  const getScoreColor = () => {
    if (clampedScore >= 70) return 'text-success';
    if (clampedScore >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = () => {
    if (clampedScore >= 80) return 'Excellent';
    if (clampedScore >= 70) return 'Strong';
    if (clampedScore >= 60) return 'Good';
    if (clampedScore >= 50) return 'Stable';
    if (clampedScore >= 40) return 'Fair';
    return 'Low';
  };

  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={clampedScore >= 70 ? 'hsl(var(--success))' : clampedScore >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center font-bold", getScoreColor())}>
          {Math.round(clampedScore)}
        </div>
      </div>
      {showLabel && (
        <span className={cn("text-xs font-medium", getScoreColor())}>
          {getScoreLabel()}
        </span>
      )}
    </div>
  );
};
