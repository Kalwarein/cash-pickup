import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  onBack?: () => void;
  progress?: number; // 0..1, shows top progress if defined
  title?: string;
  subtitle?: string;
}

export const AuthShell = ({ children, onBack, progress, title, subtitle }: Props) => {
  const navigate = useNavigate();
  const handleBack = () => (onBack ? onBack() : navigate(-1));

  return (
    <div className="relative min-h-[100svh] bg-background flex flex-col overflow-hidden">
      {/* Subtle blue ambient backdrop */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {typeof progress === 'number' && (
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(6, Math.min(100, progress * 100))}%` }}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        {(title || subtitle) && (
          <div className="mb-6 animate-fade-in">
            {title && <h1 className="text-[28px] font-extrabold tracking-tight text-foreground leading-tight">{title}</h1>}
            {subtitle && <p className="mt-2 text-muted-foreground text-[15px]">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default AuthShell;