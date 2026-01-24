import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  promo_codes: string[];
  wallet_view_preference: 'wallet' | 'profile';
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setProfile({
        id: data.id,
        name: data.name,
        email: data.email,
        created_at: data.created_at,
        promo_codes: (data.promo_codes as string[]) || [],
        wallet_view_preference: (data.wallet_view_preference as 'wallet' | 'profile') || 'wallet',
      });
    }
    setLoading(false);
  }, [user]);

  const updateViewPreference = useCallback(async (preference: 'wallet' | 'profile') => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ wallet_view_preference: preference })
      .eq('id', user.id);

    setProfile(prev => prev ? { ...prev, wallet_view_preference: preference } : null);
  }, [user]);

  const addPromoCode = useCallback(async (code: string) => {
    if (!user || !profile) return { error: 'Not authenticated' };

    const newCodes = [...profile.promo_codes, code];
    
    const { error } = await supabase
      .from('profiles')
      .update({ promo_codes: newCodes })
      .eq('id', user.id);

    if (error) return { error: error.message };

    setProfile(prev => prev ? { ...prev, promo_codes: newCodes } : null);
    return { error: null };
  }, [user, profile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { 
    profile, 
    loading, 
    updateViewPreference,
    addPromoCode,
    refetch: fetchProfile 
  };
};
