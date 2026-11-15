import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

export type Collectible = Tables<'card_catalog'>;

export function useCardMarket() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const catalogue = useQuery({
    queryKey: ['card-catalogue'],
    queryFn: async () => {
      const { data, error } = await supabase.from('card_catalog').select('*').order('initial_price');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
  const account = useQuery({
    queryKey: ['card-account', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('card_session');
      if (error) throw error;
      return data;
    },
  });
  const holdings = useQuery({
    queryKey: ['card-holdings', user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('card_holdings').select('*').is('sold_at', null).order('purchased_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    const channel = supabase.channel(`card-market-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'card_catalog' }, () => {
        cache.invalidateQueries({ queryKey: ['card-catalogue'] });
        cache.invalidateQueries({ queryKey: ['card-history'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_accounts' }, () => cache.invalidateQueries({ queryKey: ['card-account'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_holdings' }, () => cache.invalidateQueries({ queryKey: ['card-holdings'] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cache]);
  return { catalogue, account, holdings };
}

export function useCardHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['card-history', id], enabled: !!id,
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase.from('card_price_history').select('price,recorded_at').eq('card_id', id).order('recorded_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data.reverse();
    },
  });
}