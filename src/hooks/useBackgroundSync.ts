import { useEffect, useCallback } from 'react';
import { useInvestments } from './useInvestments';
import { useWallet } from './useWallet';
import { usePushNotifications } from './usePushNotifications';
import { sle } from '@/lib/currency';

export const useBackgroundSync = () => {
  const { refetch: refetchInvestments, maturedInvestments } = useInvestments();
  const { refetch: refetchWallet } = useWallet();
  const { sendNotification, permission } = usePushNotifications();

  const syncData = useCallback(async () => {
    await Promise.all([refetchInvestments(), refetchWallet()]);

    // Check for matured investments after sync
    if (permission === 'granted' && maturedInvestments && maturedInvestments.length > 0) {
      const totalValue = maturedInvestments.reduce((s, inv) => s + (inv.final_value || 0), 0);
      sendNotification('Welcome Back! 🎉', {
        body: `You have ${maturedInvestments.length} investment${maturedInvestments.length > 1 ? 's' : ''} ready to claim — ${sle(totalValue)} total!`,
        tag: 'sync-matured',
      });
    }
  }, [refetchInvestments, refetchWallet, maturedInvestments, permission, sendNotification]);

  useEffect(() => {
    const handleSync = () => syncData();
    window.addEventListener('app-online-sync', handleSync);

    // Also handle visibility change (user comes back to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('app-online-sync', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncData]);
};
