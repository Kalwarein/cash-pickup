import { useState, useEffect } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationPermissionBanner = () => {
  const { permission, supported, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!supported || permission !== 'default') return;
    const dismissedBefore = localStorage.getItem('cp_notif_dismissed');
    if (dismissedBefore) return;
    // Show after a short delay
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [supported, permission]);

  if (!show || dismissed || permission !== 'default') return null;

  const handleAllow = async () => {
    await requestPermission();
    setDismissed(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('cp_notif_dismissed', 'true');
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto animate-slide-down">
      <div className="glass-card p-4 border-2 border-primary/30 bg-card shadow-2xl rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BellRing className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Enable Notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get alerted when your investments mature and are ready to claim — even when the app is closed.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAllow}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                Allow Notifications
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 bg-muted text-muted-foreground text-xs font-semibold rounded-lg hover:bg-muted/80 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
