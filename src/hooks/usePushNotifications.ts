import { useState, useEffect, useCallback } from 'react';

const SW_PATH = '/sw-notifications.js';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    // Register our lightweight notification SW if granted
    if (result === 'granted') {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      } catch {
        // SW registration may fail in dev/iframe – fall back to basic Notification API
      }
    }
    return result;
  }, [supported]);

  const sendNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return;

      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg) {
          await reg.showNotification(title, {
            icon: '/logo-192.png',
            badge: '/logo-192.png',
            ...options,
          } as NotificationOptions);
          return;
        }
      } catch {
        // fallback
      }

      // Fallback: basic Notification API (only works when tab is open)
      new Notification(title, { icon: '/logo-192.png', ...options });
    },
    [permission],
  );

  return { permission, supported, requestPermission, sendNotification };
};
