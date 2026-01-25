import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CPRIndicatorProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
}

export const CPRIndicator = ({ 
  value, 
  size = 'md', 
  showIcon = true,
  showLabel = false 
}: CPRIndicatorProps) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const getColorClass = () => {
    if (isPositive) return 'text-success';
    if (isNegative) return 'text-destructive';
    return 'text-warning';
  };

  const getBgClass = () => {
    if (isPositive) return 'bg-success/10';
    if (isNegative) return 'bg-destructive/10';
    return 'bg-warning/10';
  };

  const sizeClasses = {
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-lg px-4 py-2 font-bold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getLabel = () => {
    if (value >= 30) return 'Exceptional';
    if (value >= 15) return 'Strong';
    if (value >= 5) return 'Positive';
    if (value > 0) return 'Slight Gain';
    if (value === 0) return 'Neutral';
    if (value > -15) return 'Slight Loss';
    if (value > -30) return 'Moderate Loss';
    if (value > -50) return 'Significant Loss';
    return 'Severe Loss';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        "flex items-center gap-1 rounded-full font-medium",
        getBgClass(),
        getColorClass(),
        sizeClasses[size]
      )}>
        {showIcon && (
          isPositive ? <TrendingUp className={iconSizes[size]} /> :
          isNegative ? <TrendingDown className={iconSizes[size]} /> :
          <Minus className={iconSizes[size]} />
        )}
        <span>{isPositive ? '+' : ''}{value.toFixed(1)}%</span>
      </div>
      {showLabel && (
        <span className={cn("text-xs", getColorClass())}>
          {getLabel()}
        </span>
      )}
    </div>
  );
};
