import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationPayload {
  id: number;
  title: string;
  body?: string;
  tone?: 'success' | 'error' | 'info' | 'warning';
  okLabel?: string;
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONE_CLASSES: Record<NonNullable<NotificationPayload['tone']>, string> = {
  success: 'from-emerald-500 to-emerald-600 text-white',
  error:   'from-red-500 to-rose-600 text-white',
  info:    'from-blue-500 to-indigo-600 text-white',
  warning: 'from-amber-500 to-orange-600 text-white',
};

export const NotificationPopup = ({ payload, onClose }: { payload: NotificationPayload; onClose: () => void }) => {
  const tone = payload.tone ?? 'info';
  const Icon = ICONS[tone];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 animate-fade-in">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-card shadow-2xl border border-border/50 overflow-hidden animate-scale-in">
        <div className={cn('flex items-center justify-center py-8 bg-gradient-to-br', TONE_CLASSES[tone])}>
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
            <Icon className="w-12 h-12 drop-shadow-md" strokeWidth={2.2} />
          </div>
        </div>
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-foreground">{payload.title}</h3>
          {payload.body && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{payload.body}</p>}
          <button
            onClick={onClose}
            className={cn(
              'mt-6 w-full py-3.5 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]',
              'bg-gradient-to-r text-white shadow-lg',
              TONE_CLASSES[tone],
            )}
          >
            {payload.okLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
