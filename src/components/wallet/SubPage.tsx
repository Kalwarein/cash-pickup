import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface SubPageProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  back?: string;
}

/** Shared premium sub-page shell with a sticky glass header and back button. */
export const SubPage = ({ title, subtitle, children, action, back = '/wallet' }: SubPageProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(back)}
            className="w-9 h-9 -ml-1 rounded-xl flex items-center justify-center hover:bg-muted active:scale-90 transition-all"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-display font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in">{children}</main>
    </div>
  );
};
