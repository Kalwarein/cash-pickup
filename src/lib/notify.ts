import { useEffect, useState } from 'react';

export type Tone = 'success' | 'error' | 'info' | 'warning';

export interface NotificationPayload {
  id: number;
  title: string;
  body?: string;
  tone?: Tone;
  okLabel?: string;
}

export interface NotifyInput {
  title: string;
  body?: string;
  tone?: Tone;
  okLabel?: string;
}

let counter = 0;
let queue: NotificationPayload[] = [];
const listeners = new Set<(q: NotificationPayload[]) => void>();

const emit = () => listeners.forEach((l) => l([...queue]));

const push = (input: NotifyInput) => {
  counter += 1;
  queue = [...queue, { id: counter, tone: 'info', okLabel: 'OK', ...input }];
  emit();
};

export const dismissNotification = () => {
  queue = queue.slice(1);
  emit();
};

type NotifyFn = ((input: NotifyInput | string) => void) & {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
  warning: (title: string, body?: string) => void;
};

export const notify: NotifyFn = ((input: NotifyInput | string) => {
  if (typeof input === 'string') push({ title: input });
  else push(input);
}) as NotifyFn;

notify.success = (title, body) => push({ title, body, tone: 'success' });
notify.error = (title, body) => push({ title, body, tone: 'error' });
notify.info = (title, body) => push({ title, body, tone: 'info' });
notify.warning = (title, body) => push({ title, body, tone: 'warning' });

export const useNotificationQueue = () => {
  const [q, setQ] = useState<NotificationPayload[]>(queue);
  useEffect(() => {
    listeners.add(setQ);
    setQ([...queue]);
    return () => { listeners.delete(setQ); };
  }, []);
  return q;
};
