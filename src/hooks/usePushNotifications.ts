import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SW_PATH = '/sw-notifications.js';

const FRIENDLY_MESSAGES = [
  (bal: string) => `💰 Your balance is ${bal}. The market is heating up — time to explore!`,
  (bal: string) => `📊 Market update! Your balance: ${bal}. Check top performers now.`,
  (bal: string) => `🔥 Hot tip! Companies are showing strong CPR today. Balance: ${bal}`,
  (bal: string) => `📈 Some companies are up big today! Your wallet has ${bal}.`,
  (bal: string) => `💎 Hidden gems may surprise you today. Balance: ${bal}. Invest wisely!`,
  (bal: string) => `⚡ Quick check: ${bal} in your wallet. New opportunities await!`,
  (bal: string) => `🎯 Your portfolio balance: ${bal}. Time for your next move?`,
  (bal: string) => `🌟 Cash Pickup tip: Diversify your investments! Balance: ${bal}`,
  (bal: string) => `📉 Some companies dipped — buy low opportunity? Balance: ${bal}`,
  (bal: string) => `🏆 Top investors are active right now. Your balance: ${bal}. Join them!`,
  () => `⏰ Market hours reminder: Check your active investments!`,
  () => `🔔 Your investments are growing! Don't forget to check your returns.`,
  () => `💡 Pro tip: Lower risk companies provide steadier returns over time.`,
  () => `📋 Weekly summary available! See how your portfolio performed.`,
  () => `🎁 Check the promo marketplace — new codes may be available!`,
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

    // First one after 2 minutes, then every 30 min
    const initialTimeout = setTimeout(sendFriendly, 2 * 60 * 1000);
    friendlyTimer.current = setInterval(sendFriendly, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      if (friendlyTimer.current) clearInterval(friendlyTimer.current);
    };

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
