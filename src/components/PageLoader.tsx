import { cn } from '@/lib/utils';

interface PageLoaderProps {
  /** Optional label shown under the spinner */
  label?: string;
  /** Render full-screen (default) or inline within a container */
  inline?: boolean;
  className?: string;
}

/**
 * Premium fintech spinner shown while a page loads its data.
 * Renders an animated dual-ring spinner over a layered background.
 */
export const PageLoader = ({ label = 'Loading…', inline = false, className }: PageLoaderProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-4',
      inline ? 'w-full py-20' : 'min-h-[100svh] bg-background',
      className,
    )}
    role="status"
    aria-live="polite"
  >
    <div className="relative w-12 h-12">
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      <span className="absolute inset-1.5 rounded-full bg-primary/10 animate-pulse" />
    </div>
    {label && <p className="text-sm text-muted-foreground font-medium tracking-wide">{label}</p>}
  </div>
);

export default PageLoader;
