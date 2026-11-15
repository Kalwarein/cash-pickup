import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CardCatalogRow,
  CardHoldingRow,
  CardPriceHistoryRow,
  CardTradeResult,
  CardWalletLedgerRow,
  CardWalletRow,
} from '@/integrations/supabase/card-trading-types';

export const cardQueryKeys = {
  catalog: ['card-catalog'] as const,
  wallet: (userId: string | undefined) => ['card-wallet', userId] as const,
  holdings: (userId: string | undefined) => ['card-holdings', userId] as const,
  ledger: (userId: string | undefined) => ['card-ledger', userId] as const,
  history: (cardId: string | undefined) => ['card-price-history', cardId] as const,
};

export const useCardCatalog = () => useQuery<CardCatalogRow[]>({
  queryKey: cardQueryKeys.catalog,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('card_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true });
    if (error) throw error;
    return data;
  },
  staleTime: 15_000,
  refetchInterval: 60_000,
});

export const useCardWallet = () => {
  const { user } = useAuth();
  return useQuery<CardWalletRow | null>({
    queryKey: cardQueryKeys.wallet(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('card_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
};

export const useCardHoldings = () => {
  const { user } = useAuth();
  return useQuery<CardHoldingRow[]>({
    queryKey: cardQueryKeys.holdings(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('card_holdings')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
};

export const useCardLedger = (limit = 30) => {
  const { user } = useAuth();
  return useQuery<CardWalletLedgerRow[]>({
    queryKey: [...cardQueryKeys.ledger(user?.id), limit],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('card_wallet_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: 10_000,
  });
};

export const useCardPriceHistory = (cardId?: string) => useQuery<CardPriceHistoryRow[]>({
  queryKey: cardQueryKeys.history(cardId),
  enabled: Boolean(cardId),
  queryFn: async () => {
    if (!cardId) return [];
    const { data, error } = await supabase
      .from('card_price_history')
      .select('*')
      .eq('card_id', cardId)
      .order('recorded_at', { ascending: false })
      .limit(72);
    if (error) throw error;
    return [...data].reverse();
  },
  staleTime: 5_000,
  refetchInterval: 30_000,
});

export const useCardRealtime = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`card-market-${user?.id ?? 'public'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_catalog' }, () => {
        void queryClient.invalidateQueries({ queryKey: cardQueryKeys.catalog });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_price_history' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['card-price-history'] });
      });

    if (user?.id) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'card_wallets', filter: `user_id=eq.${user.id}` }, () => {
          void queryClient.invalidateQueries({ queryKey: cardQueryKeys.wallet(user.id) });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'card_holdings', filter: `user_id=eq.${user.id}` }, () => {
          void queryClient.invalidateQueries({ queryKey: cardQueryKeys.holdings(user.id) });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'card_wallet_ledger', filter: `user_id=eq.${user.id}` }, () => {
          void queryClient.invalidateQueries({ queryKey: ['card-ledger', user.id] });
        });
    }

    void channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, user?.id]);
};

function parseTradeResult(value: unknown): CardTradeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('The market returned an invalid trade receipt. Refresh and check your collection before retrying.');
  }
  const result = value as Record<string, unknown>;
  const numeric = (key: string) => {
    const parsed = typeof result[key] === 'number' ? result[key] : Number(result[key]);
    if (!Number.isFinite(parsed)) throw new Error(`The market returned an invalid ${key} value.`);
    return parsed;
  };
  const stringValue = (key: string) => {
    if (typeof result[key] !== 'string') throw new Error(`The market returned an invalid ${key} value.`);
    return result[key] as string;
  };
  const side = result.side;
  if (side !== 'buy' && side !== 'sell') throw new Error('The market returned an invalid trade side.');

  return {
    trade_id: stringValue('trade_id'),
    holding_id: stringValue('holding_id'),
    serial_code: typeof result.serial_code === 'string' ? result.serial_code : undefined,
    side,
    unit_price: numeric('unit_price'),
    purchase_price: result.purchase_price === undefined ? undefined : numeric('purchase_price'),
    price_after: numeric('price_after'),
    profit_loss: numeric('profit_loss'),
    balance: numeric('balance'),
    idempotent_replay: result.idempotent_replay === true,
  };
}

const refreshAfterTrade = async (queryClient: ReturnType<typeof useQueryClient>, userId?: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: cardQueryKeys.catalog }),
    queryClient.invalidateQueries({ queryKey: cardQueryKeys.wallet(userId) }),
    queryClient.invalidateQueries({ queryKey: cardQueryKeys.holdings(userId) }),
    queryClient.invalidateQueries({ queryKey: ['card-ledger', userId] }),
    queryClient.invalidateQueries({ queryKey: ['card-price-history'] }),
  ]);
};

export const useCardTradeActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const buyMutation = useMutation({
    mutationFn: async ({ cardId, requestId }: { cardId: string; requestId: string }) => {
      const { data, error } = await supabase.rpc('buy_card', {
        p_card_id: cardId,
        p_request_id: requestId,
      });
      if (error) throw error;
      return parseTradeResult(data);
    },
    onSuccess: () => refreshAfterTrade(queryClient, user?.id),
  });

  const sellMutation = useMutation({
    mutationFn: async ({ holdingId, requestId }: { holdingId: string; requestId: string }) => {
      const { data, error } = await supabase.rpc('sell_card', {
        p_holding_id: holdingId,
        p_request_id: requestId,
      });
      if (error) throw error;
      return parseTradeResult(data);
    },
    onSuccess: () => refreshAfterTrade(queryClient, user?.id),
  });

  return {
    buyCard: (cardId: string, requestId: string) => buyMutation.mutateAsync({ cardId, requestId }),
    sellCard: (holdingId: string, requestId: string) => sellMutation.mutateAsync({ holdingId, requestId }),
    isBuying: buyMutation.isPending,
    isSelling: sellMutation.isPending,
  };
};
