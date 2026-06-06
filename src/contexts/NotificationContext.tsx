import { ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  notify,
  useNotificationQueue,
  dismissNotification,
  Tone,
} from '@/lib/notify';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONE: Record<Tone, { ring: string; icon: string; btn: string }> = {
  success: { ring: 'bg-success/10', icon: 'text-success', btn: 'bg-success text-success-foreground' },
  error:   { ring: 'bg-destructive/10', icon: 'text-destructive', btn: 'bg-destructive text-destructive-foreground' },
  info:    { ring: 'bg-primary/10', icon: 'text-primary', btn: 'gradient-primary text-primary-foreground' },
  warning: { ring: 'bg-warning/10', icon: 'text-warning', btn: 'bg-warning text-warning-foreground' },
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const queue = useNotificationQueue();
  const current = queue[0];
  const tone: Tone = current?.tone ?? 'info';
  const Icon = ICONS[tone];
  const styles = TONE[tone];

  return (
    <>
      {children}
      <Drawer open={!!current} onOpenChange={(o) => { if (!o) dismissNotification(); }}>
        <DrawerContent className="max-w-sm mx-auto">
          {current && (
            <div className="px-6 pb-7 pt-3 text-center animate-fade-in">
              <div className={cn('mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full', styles.ring)}>
                <Icon className={cn('h-8 w-8', styles.icon)} strokeWidth={2.2} />
              </div>
              <DrawerTitle className="text-xl font-display font-bold tracking-tight">
                {current.title}
              </DrawerTitle>
              {current.body && (
                <DrawerDescription className="mt-2 text-sm leading-relaxed">
                  {current.body}
                </DrawerDescription>
              )}
              <button
                onClick={dismissNotification}
                className={cn(
                  'mt-6 w-full rounded-2xl py-3.5 text-base font-semibold shadow-float transition-all active:scale-[0.97]',
                  styles.btn,
                )}
              >
                {current.okLabel ?? 'OK'}
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};

export const useNotify = () => notify;
