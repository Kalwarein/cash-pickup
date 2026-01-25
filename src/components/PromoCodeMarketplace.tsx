import { useState } from 'react';
import { X, Shield, TrendingUp, Target, Zap, Clock, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

interface PromoCodeMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const getEffectIcon = (effectType: string) => {
  switch (effectType) {
    case 'loss_reduction':
      return Shield;
    case 'profit_boost':
      return TrendingUp;
    case 'min_floor':
      return Target;
    case 'multiplier':
      return Zap;
    default:
      return Shield;
  }
};

const getEffectColor = (effectType: string) => {
  switch (effectType) {
    case 'loss_reduction':
      return 'text-blue-500 bg-blue-500/10';
    case 'profit_boost':
      return 'text-success bg-success/10';
    case 'min_floor':
      return 'text-warning bg-warning/10';
    case 'multiplier':
      return 'text-purple-500 bg-purple-500/10';
    default:
      return 'text-primary bg-primary/10';
  }
};

export const PromoCodeMarketplace = ({ isOpen, onClose }: PromoCodeMarketplaceProps) => {
  const { promoCodes, userPromoCodes, purchasePromoCode, getActivePromoCodes } = usePromoCodes();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  if (!isOpen) return null;

  const activePromoCodes = getActivePromoCodes();

  const handlePurchase = async (promoCodeId: string) => {
    setPurchasing(promoCodeId);
    const { error } = await purchasePromoCode(promoCodeId);
    
    if (error) {
      toast.error(error);
    } else {
      toast.success('Promo code purchased successfully!');
      await refetchWallet();
    }
    setPurchasing(null);
  };

  const isOwned = (promoCodeId: string) => {
    return activePromoCodes.some(up => up.promo_code_id === promoCodeId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Promo Code Marketplace</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Risk Warning */}
        <div className="glass-card p-4 mb-4 bg-warning/10 border-warning/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Important Notice</p>
              <p className="text-xs text-muted-foreground mt-1">
                Promo codes modify risk but do not guarantee profit. All investments remain subject to loss based on Company Performance Rate (CPR).
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="glass-card p-4 mb-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold">{sle(wallet?.balance || 0)}</p>
        </div>

        {/* Active Promo Codes */}
        {activePromoCodes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Your Active Codes</h3>
            <div className="flex gap-2 flex-wrap">
              {activePromoCodes.map((upc) => (
                <div key={upc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                  <Check className="w-3 h-3" />
                  <span>{upc.promo_code?.code}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promo Codes Grid */}
        <div className="space-y-3">
          {promoCodes.map((promo) => {
            const Icon = getEffectIcon(promo.effect_type);
            const colorClass = getEffectColor(promo.effect_type);
            const owned = isOwned(promo.id);
            const canAfford = (wallet?.balance || 0) >= promo.price;

            return (
              <div 
                key={promo.id} 
                className={cn(
                  "glass-card p-4 transition-all",
                  owned && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{promo.name}</p>
                      <p className="text-xs text-muted-foreground">{promo.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{sle(promo.price)}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{promo.duration_days} days</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>

                <div className="flex items-center justify-between">
                  <div className={cn("text-sm font-medium px-2 py-1 rounded", colorClass)}>
                    {promo.effect_type === 'multiplier' 
                      ? `${promo.effect_value}x multiplier`
                      : `${promo.effect_value}% effect`
                    }
                  </div>
                  
                  {owned ? (
                    <div className="flex items-center gap-1 text-success text-sm">
                      <Check className="w-4 h-4" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(promo.id)}
                      disabled={!canAfford || purchasing === promo.id}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium text-sm transition-all",
                        canAfford 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {purchasing === promo.id ? 'Processing...' : canAfford ? 'Purchase' : 'Insufficient'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
