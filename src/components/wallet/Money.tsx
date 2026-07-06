import { AnimatedNumber } from '@/components/tap/AnimatedNumber';
import { cn } from '@/lib/utils';

interface MoneyProps {
  value: number;
  className?: string;
  showSign?: boolean;
  suffix?: boolean;
  decimals?: number;
  compact?: boolean;
}

/** Animated SLE money value. Smoothly counts to new values. */
export const Money = ({ value, className, showSign = false, suffix = true, decimals = 2, compact = false }: MoneyProps) => {
  const sign = showSign && value > 0 ? '+' : value < 0 ? '' : '';
  return (
    <AnimatedNumber
      value={value}
      decimals={decimals}
      compact={compact}
      prefix={sign}
      suffix={suffix ? ' SLE' : ''}
      className={cn('tabular-nums', className)}
    />
  );
};
