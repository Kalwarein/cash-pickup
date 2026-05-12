import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from 'react';
import { NotificationPopup, NotificationPayload } from '@/components/NotificationPopup';

type Tone = 'success' | 'error' | 'info' | 'warning';

interface NotifyInput {
  title: string;
  body?: string;
  tone?: Tone;
  okLabel?: string;
}

interface Ctx {
  notify: (n: NotifyInput) => void;
}

const NotificationContext = createContext<Ctx | null>(null);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<NotificationPayload[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((n: NotifyInput) => {
    idRef.current += 1;
    setQueue((q) => [...q, { id: idRef.current, tone: 'info', okLabel: 'OK', ...n }]);
  }, []);

  const dismiss = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);
  const current = queue[0];

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {current && <NotificationPopup key={current.id} payload={current} onClose={dismiss} />}
    </NotificationContext.Provider>
  );
};

export const useNotify = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used inside <NotificationProvider>');
  return ctx.notify;
};
