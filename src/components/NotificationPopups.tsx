import { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Bell, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useInvestments } from '@/hooks/useInvestments';
import { useWallet } from '@/hooks/useWallet';
import { PromoCodePopup } from '@/components/PromoCodePopup';

type NotificationType = 'promo_activate' | 'investment_claim' | 'low_balance' | null;

interface Notification {
  type: NotificationType;
  data?: Record<string, unknown>;
}

export const NotificationPopups = () => {
  const { userPromoCodes, promoCodes } = usePromoCodes();
  const { maturedInvestments } = useInvestments();
  const { wallet } = useWallet();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [selectedPromoForActivation, setSelectedPromoForActivation] = useState<typeof promoCodes[0] | null>(null);

  useEffect(() => {
    // Check for notifications in priority order
    const checkNotifications = () => {
      // 1. Check for unclaimed matured investments
      if (maturedInvestments && maturedInvestments.length > 0 && !dismissed.has('investment_claim')) {
        setCurrentNotification({ type: 'investment_claim' });
        return;
      }

      // 2. Check for unused promo codes (purchased but not activated)
      const unusedPromos = userPromoCodes.filter(up => 
        up.is_active && new Date(up.expires_at) > new Date()
      );
      if (unusedPromos.length > 0 && !dismissed.has('promo_activate')) {
        const promoDetail = promoCodes.find(p => p.id === unusedPromos[0].promo_code_id);
        if (promoDetail) {
          setCurrentNotification({ 
            type: 'promo_activate', 
            data: { promoCode: promoDetail, userPromoCodeId: unusedPromos[0].id } 
          });
          return;
        }
      }

      // 3. Low balance warning
      if (wallet && wallet.balance < 100 && !dismissed.has('low_balance')) {
        setCurrentNotification({ type: 'low_balance' });
        return;
      }

      setCurrentNotification(null);
    };

    const timer = setTimeout(checkNotifications, 2000);
    return () => clearTimeout(timer);
  }, [userPromoCodes, maturedInvestments, wallet, dismissed, promoCodes]);

  const dismiss = (type: string) => {
    setDismissed(prev => new Set(prev).add(type));
    setCurrentNotification(null);
  };

  if (!currentNotification) return null;

  // Investment claim notification
  if (currentNotification.type === 'investment_claim') {
    const count = maturedInvestments?.length || 0;
    return (
      <div className="fixed bottom-28 left-4 right-4 z-40 animate-slide-up max-w-lg mx-auto">
        <div className="glass-card p-4 border-2 border-success/30 bg-card shadow-2xl rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-success/10">
              <Bell className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Investments Ready!</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {count} investment{count > 1 ? 's' : ''} matured and ready to claim
              </p>
            </div>
            <button onClick={() => dismiss('investment_claim')} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Promo activate notification
  if (currentNotification.type === 'promo_activate') {
    const promoCode = currentNotification.data?.promoCode as typeof promoCodes[0];
    return (
      <>
        <div className="fixed bottom-28 left-4 right-4 z-40 animate-slide-up max-w-lg mx-auto">
          <div className="glass-card p-4 border-2 border-primary/30 bg-card shadow-2xl rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">Unused Promo Code!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You have <span className="text-primary font-medium">{promoCode?.name}</span> ready to activate
                </p>
                <button
                  onClick={() => {
                    setSelectedPromoForActivation(promoCode);
                    setShowPromoPopup(true);
                    dismiss('promo_activate');
                  }}
                  className="mt-2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Activate Now
                </button>
              </div>
              <button onClick={() => dismiss('promo_activate')} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {showPromoPopup && selectedPromoForActivation && (
          <PromoCodePopup
            isOpen={showPromoPopup}
            onClose={() => setShowPromoPopup(false)}
            promoCode={selectedPromoForActivation}
            variant="activate"
          />
        )}
      </>
    );
  }

  // Low balance notification
  if (currentNotification.type === 'low_balance') {
    return (
      <div className="fixed bottom-28 left-4 right-4 z-40 animate-slide-up max-w-lg mx-auto">
        <div className="glass-card p-4 border-2 border-warning/30 bg-card shadow-2xl rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-warning/10">
              <Wallet className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Low Balance</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your balance is {sle(wallet?.balance || 0)}. Consider depositing to keep investing.
              </p>
            </div>
            <button onClick={() => dismiss('low_balance')} className="p-1 hover:bg-muted rounded-lg">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
