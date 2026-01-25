import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PromoCode {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  effect_type: 'loss_reduction' | 'profit_boost' | 'min_floor' | 'multiplier';
  effect_value: number;
  duration_days: number;
  is_active: boolean;
}

interface UserPromoCode {
  id: string;
  promo_code_id: string;
  promo_code?: PromoCode;
  purchased_at: string;
  expires_at: string;
  is_active: boolean;
  uses_remaining: number | null;
}

export const usePromoCodes = () => {
  const { user } = useAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [userPromoCodes, setUserPromoCodes] = useState<UserPromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPromoCodes = useCallback(async () => {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (!error && data) {
      setPromoCodes(data.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        effect_type: p.effect_type as PromoCode['effect_type'],
        effect_value: Number(p.effect_value),
        duration_days: p.duration_days,
        is_active: p.is_active,
      })));
    }
    setLoading(false);
  }, []);

  const fetchUserPromoCodes = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_promo_codes')
      .select(`
        *,
        promo_codes (*)
      `)
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (!error && data) {
      setUserPromoCodes(data.map(up => ({
        id: up.id,
        promo_code_id: up.promo_code_id,
        promo_code: up.promo_codes ? {
          id: up.promo_codes.id,
          code: up.promo_codes.code,
          name: up.promo_codes.name,
          description: up.promo_codes.description,
          price: Number(up.promo_codes.price),
          effect_type: up.promo_codes.effect_type as PromoCode['effect_type'],
          effect_value: Number(up.promo_codes.effect_value),
          duration_days: up.promo_codes.duration_days,
          is_active: up.promo_codes.is_active,
        } : undefined,
        purchased_at: up.purchased_at,
        expires_at: up.expires_at,
        is_active: up.is_active,
        uses_remaining: up.uses_remaining,
      })));
    }
  }, [user]);

  const purchasePromoCode = useCallback(async (promoCodeId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const promoCode = promoCodes.find(p => p.id === promoCodeId);
    if (!promoCode) return { error: 'Promo code not found' };

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) return { error: 'Wallet not found' };
    if (Number(wallet.balance) < promoCode.price) return { error: 'Insufficient balance' };

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + promoCode.duration_days);

    // Insert user promo code
    const { error: insertError } = await supabase
      .from('user_promo_codes')
      .insert({
        user_id: user.id,
        promo_code_id: promoCodeId,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

    if (insertError) return { error: insertError.message };

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({ balance: Number(wallet.balance) - promoCode.price })
      .eq('user_id', user.id);

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'promo_purchase',
        amount: promoCode.price,
        description: `Purchased ${promoCode.name} promo code`,
      });

    await fetchUserPromoCodes();
    return { error: null };
  }, [user, promoCodes, fetchUserPromoCodes]);

  // Get active promo codes for the user
  const getActivePromoCodes = useCallback(() => {
    const now = new Date();
    return userPromoCodes.filter(up => 
      up.is_active && 
      new Date(up.expires_at) > now
    );
  }, [userPromoCodes]);

  // Get the best promo code for an investment
  const getBestPromoCode = useCallback((forLoss: boolean = true) => {
    const active = getActivePromoCodes();
    if (active.length === 0) return null;

    if (forLoss) {
      // For losses, prioritize loss_reduction and min_floor
      const lossProtection = active.filter(p => 
        p.promo_code?.effect_type === 'loss_reduction' || 
        p.promo_code?.effect_type === 'min_floor'
      );
      if (lossProtection.length > 0) {
        return lossProtection.sort((a, b) => 
          (b.promo_code?.effect_value || 0) - (a.promo_code?.effect_value || 0)
        )[0];
      }
    } else {
      // For profits, prioritize multiplier and profit_boost
      const profitBoost = active.filter(p => 
        p.promo_code?.effect_type === 'multiplier' || 
        p.promo_code?.effect_type === 'profit_boost'
      );
      if (profitBoost.length > 0) {
        return profitBoost.sort((a, b) => 
          (b.promo_code?.effect_value || 0) - (a.promo_code?.effect_value || 0)
        )[0];
      }
    }

    return active[0];
  }, [getActivePromoCodes]);

  useEffect(() => {
    fetchPromoCodes();
    fetchUserPromoCodes();
  }, [fetchPromoCodes, fetchUserPromoCodes]);

  return {
    promoCodes,
    userPromoCodes,
    loading,
    purchasePromoCode,
    getActivePromoCodes,
    getBestPromoCode,
    refetch: () => {
      fetchPromoCodes();
      fetchUserPromoCodes();
    },
  };
};
