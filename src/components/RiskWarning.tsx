import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskWarningProps {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
}

export const RiskWarning = ({ variant = 'default', className }: RiskWarningProps) => {
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-2 text-warning text-xs", className)}>
        <AlertTriangle className="w-3 h-3" />
        <span>Investment involves risk. You may lose some or all of your investment.</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20", className)}>
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="text-warning font-medium">Risk Warning:</span> Investments may result in partial or total loss. Past performance does not guarantee future results.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("glass-card p-4 bg-warning/5 border-warning/20", className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-warning">Investment Risk Warning</p>
          <p className="text-xs text-muted-foreground mt-1">
            All investments are subject to risk. The Company Performance Rate (CPR) determines your returns on maturity. 
            You may lose part or all of your invested amount. Only invest what you can afford to lose.
          </p>
        </div>
      </div>
    </div>
  );
};
