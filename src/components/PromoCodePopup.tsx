import { useState, useEffect } from 'react';
import { X, Gift, Sparkles, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

interface PromoCodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  promoCode?: {
    id: string;
    code: string;
    name: string;
    description: string;
    price: number;
    effect_type: string;
    effect_value: number;
    duration_days: number;
  };
  variant: 'buy' | 'activate';
  userPromoCodeId?: string;
}

export const PromoCodePopup = ({ 
  isOpen, 
  onClose, 
  promoCode,
  variant,
  userPromoCodeId 
}: PromoCodePopupProps) => {
  const { purchasePromoCode, refetch } = usePromoCodes();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [loading, setLoading] = useState(false);

  if (!isOpen || !promoCode) return null;

  const handleAction = async () => {
    setLoading(true);
    
    if (variant === 'buy') {
      const { error } = await purchasePromoCode(promoCode.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`Successfully purchased ${promoCode.name}!`);
        await refetchWallet();
        onClose();
      }
    } else {
      // Activate promo code - handled separately
      toast.success(`${promoCode.name} activated!`);
      onClose();
    }
    
    setLoading(false);
    refetch();
  };

  const canAfford = variant === 'buy' ? (wallet?.balance || 0) >= promoCode.price : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-card rounded-3xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Header with gradient */}
        <div className="relative h-40 bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              {variant === 'buy' ? (
                <Gift className="w-8 h-8 text-white" />
              ) : (
                <Sparkles className="w-8 h-8 text-white" />
              )}
            </div>
            <p className="text-white/80 text-sm">{promoCode.code}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">{promoCode.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{promoCode.description}</p>
          </div>

          {/* Effect badge */}
          <div className="flex justify-center">
            <div className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
              {promoCode.effect_type === 'multiplier' 
                ? `${promoCode.effect_value}x Multiplier`
                : `${promoCode.effect_value}% Effect`
              }
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Valid for {promoCode.duration_days} days</span>
          </div>

          {/* Price / Action */}
          {variant === 'buy' && (
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{sle(promoCode.price)}</p>
              <p className="text-xs text-muted-foreground">Your balance: {sle(wallet?.balance || 0)}</p>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleAction}
            disabled={loading || !canAfford}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-lg transition-all",
              canAfford
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {loading ? 'Processing...' : variant === 'buy' 
              ? (canAfford ? 'Buy Now' : 'Insufficient Balance')
              : 'Activate Now'
            }
          </button>

          {variant === 'activate' && (
            <p className="text-xs text-center text-muted-foreground">
              This promo code will be applied to your next investment
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
