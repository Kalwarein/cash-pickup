import { cn } from '@/lib/utils';

interface PremiumSpinnerProps {
  size?: number;
  label?: string;
  className?: string;
}

/**
 * Premium gradient ring spinner used app-wide for loading states.
 * Conic gradient ring + inner pulsing dot, blue brand palette.
 */
export const PremiumSpinner = ({ size = 48, label, className }: PremiumSpinnerProps) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className="relative rounded-full animate-spin"
        style={{
          width: size,
          height: size,
          background: 'conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary)) 270deg, transparent 360deg)',
          animationDuration: '1.1s',
        }}
      >
        <div
          className="absolute inset-[3px] rounded-full bg-background flex items-center justify-center"
        >
          <span className="block w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      {label && (
        <p className="text-xs font-medium text-muted-foreground tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export const FullScreenSpinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <PremiumSpinner size={64} label={label} />
  </div>
);