import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestmentProgressBarProps {
  maturityDate: string;
  maturityDays: number;
  createdAt: string;
  companyName: string;
  amount: number;
  showDetails?: boolean;
}

export const InvestmentProgressBar = ({
  maturityDate,
  maturityDays,
  createdAt,
  companyName,
  amount,
  showDetails = true,
}: InvestmentProgressBarProps) => {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date().getTime();
      const start = new Date(createdAt).getTime();
      const end = new Date(maturityDate).getTime();
      const total = end - start;
      const elapsed = now - start;
      
      const progressPercent = Math.min(100, Math.max(0, (elapsed / total) * 100));
      setProgress(progressPercent);
      setIsComplete(progressPercent >= 100);

      // Calculate time remaining
      const remaining = end - now;
      if (remaining <= 0) {
        setTimeRemaining('Maturing...');
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m`);
        } else {
          setTimeRemaining(`${minutes}m`);
        }
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);
    return () => clearInterval(interval);
  }, [maturityDate, createdAt]);

  return (
    <div className="space-y-2">
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Maturity Progress</span>
          <span className={cn(
            "font-medium flex items-center gap-1",
            isComplete ? "text-success" : "text-primary"
          )}>
            {isComplete ? (
              <>
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>Ready to mature!</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                <span>{timeRemaining} left</span>
              </>
            )}
          </span>
        </div>
      )}
      
      {/* Animated Progress Bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Background glow effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full opacity-30 blur-sm transition-all duration-1000",
            isComplete ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
        
        {/* Main progress bar */}
        <div 
          className={cn(
            "relative h-full rounded-full transition-all duration-500 ease-out",
            isComplete 
              ? "bg-gradient-to-r from-success/80 to-success" 
              : "bg-gradient-to-r from-primary/80 to-primary"
          )}
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div 
              className={cn(
                "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
                "animate-[shimmer_2s_infinite]"
              )}
              style={{
                transform: 'skewX(-20deg)',
              }}
            />
          </div>
        </div>

        {/* Completion indicator */}
        {isComplete && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1">
            <CheckCircle className="w-4 h-4 text-success animate-scale-in" />
          </div>
        )}
      </div>

      {/* Progress percentage */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className={cn(
            "font-semibold",
            isComplete ? "text-success" : "text-primary"
          )}>
            {progress.toFixed(0)}%
          </span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
};
