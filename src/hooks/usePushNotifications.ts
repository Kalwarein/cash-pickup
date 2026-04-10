import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SW_PATH = '/sw-notifications.js';

const FRIENDLY_MESSAGES = [
  (bal: string) => `Your balance is ${bal}. The market looks promising today — consider investing! 📈`,
  (bal: string) => `Hey! You have ${bal} in your wallet. Some companies are showing strong growth this week! 💪`,
  (bal: string) => `Market update: Several companies are performing well. Your balance: ${bal}. Don't miss out! 🔥`,
  (bal: string) => `Quick check-in! You have ${bal} available. More shares opening up across the market today! 🚀`,
  (bal: string) => `Your Cash Pickup balance: ${bal}. The market is active — great time to explore opportunities! ✨`,
  (bal: string) => `Hi investor! Balance: ${bal}. Some silent performers are quietly generating profits 🤫`,
  (bal: string) => `Market pulse: Activity is high today! Your wallet: ${bal}. Ready to grow? 📊`,
  (bal: string) => `Your portfolio awaits! Balance: ${bal}. Multiple companies showing positive trends today 🌟`,
];

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [supported, setSupported] = useState(false);
  const friendlyTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      try {
        await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      } catch { /* SW registration may fail in dev */ }
    }
    return result;
  }, [supported]);

  const sendNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return;
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg) {
          await reg.showNotification(title, { icon: '/logo-192.png', badge: '/logo-192.png', ...options } as NotificationOptions);
          return;
        }
      } catch { /* fallback */ }
      new Notification(title, { icon: '/logo-192.png', ...options });
    },
    [permission],
  );

  // Periodic friendly notifications every 30 minutes
  useEffect(() => {
    if (permission !== 'granted' || !user) return;

    const sendFriendly = async () => {
      try {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!wallet) return;

        const bal = `${Number(wallet.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} SLE`;
        const msg = FRIENDLY_MESSAGES[Math.floor(Math.random() * FRIENDLY_MESSAGES.length)];

        sendNotification('Cash Pickup 💰', {
          body: msg(bal),
          tag: 'friendly-update',
        });
      } catch { /* ignore */ }
    };

    // First one after 30 min
    friendlyTimer.current = setInterval(sendFriendly, 30 * 60 * 1000);

    return () => {
      if (friendlyTimer.current) clearInterval(friendlyTimer.current);
    };
  }, [permission, user, sendNotification]);

  // Background sync: refresh data when coming back online
  useEffect(() => {
    const handleOnline = () => {
      window.dispatchEvent(new CustomEvent('app-online-sync'));
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return { permission, supported, requestPermission, sendNotification };
};
