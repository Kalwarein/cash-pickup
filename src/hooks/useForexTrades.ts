import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ForexTrade {
  id: string;
  entry_price: number;
  exit_price: number | null;
  amount: number;
  take_profit: number;
  stop_loss: number;
  max_duration_minutes: number;
  expires_at: string;
  status: 'open' | 'closed_tp' | 'closed_sl' | 'closed_expired' | 'closed_manual';
  profit_loss: number;
  closed_at: string | null;
  created_at: string;
}

export const useForexTrades = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<ForexTrade[]>([]);
  const [openTrades, setOpenTrades] = useState<ForexTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('forex_trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      const typedTrades = data.map(t => ({
        id: t.id,
        entry_price: Number(t.entry_price),
        exit_price: t.exit_price ? Number(t.exit_price) : null,
        amount: Number(t.amount),
        take_profit: Number(t.take_profit),
        stop_loss: Number(t.stop_loss),
        max_duration_minutes: t.max_duration_minutes,
        expires_at: t.expires_at,
        status: t.status as ForexTrade['status'],
        profit_loss: Number(t.profit_loss),
        closed_at: t.closed_at,
        created_at: t.created_at,
      }));
      
      setTrades(typedTrades);
      setOpenTrades(typedTrades.filter(t => t.status === 'open'));
    }
    setLoading(false);
  }, [user]);

  // Open a new trade
  const openTrade = useCallback(async (
    currentPrice: number,
    amount: number,
    takeProfitPercent: number,
    stopLossPercent: number,
    durationMinutes: number
  ) => {
    if (!user) return { error: 'Not authenticated' };

    // Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) return { error: 'Wallet not found' };
    if (Number(wallet.balance) < amount) return { error: 'Insufficient balance' };

    // Calculate TP and SL prices
    const takeProfit = currentPrice * (1 + takeProfitPercent / 100);
    const stopLoss = currentPrice * (1 - stopLossPercent / 100);
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    // Create trade
    const { error: tradeError } = await supabase
      .from('forex_trades')
      .insert({
        user_id: user.id,
        entry_price: currentPrice,
        amount,
        take_profit: takeProfit,
        stop_loss: stopLoss,
        max_duration_minutes: durationMinutes,
        expires_at: expiresAt.toISOString(),
        status: 'open',
        profit_loss: 0,
      });

    if (tradeError) return { error: tradeError.message };

    // Deduct from wallet
    await supabase
      .from('wallets')
      .update({ balance: Number(wallet.balance) - amount })
      .eq('user_id', user.id);

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'trade_open',
        amount: -amount,
        description: `Opened trade at $${currentPrice.toFixed(2)}`,
      });

    await fetchTrades();
    return { error: null };
  }, [user, fetchTrades]);

  // Close trade manually
  const closeTrade = useCallback(async (tradeId: string, currentPrice: number) => {
    if (!user) return { error: 'Not authenticated' };

    const trade = openTrades.find(t => t.id === tradeId);
    if (!trade) return { error: 'Trade not found' };

    // Calculate P/L
    const priceChange = (currentPrice - trade.entry_price) / trade.entry_price;
    const profitLoss = trade.amount * priceChange;
    const finalAmount = trade.amount + profitLoss;

    // Update trade
    await supabase
      .from('forex_trades')
      .update({
        exit_price: currentPrice,
        status: 'closed_manual',
        profit_loss: profitLoss,
        closed_at: new Date().toISOString(),
      })
      .eq('id', tradeId);

    // Return funds to wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) + finalAmount;
      const newProfit = profitLoss > 0 ? Number(wallet.total_profit) + profitLoss : Number(wallet.total_profit);
      const newLoss = profitLoss < 0 ? Number(wallet.total_loss) + Math.abs(profitLoss) : Number(wallet.total_loss);

      await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          total_profit: newProfit,
          total_loss: newLoss,
        })
        .eq('user_id', user.id);
    }

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
        amount: finalAmount,
        description: `Closed trade at $${currentPrice.toFixed(2)} (${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)})`,
      });

    await fetchTrades();
    return { error: null, profitLoss };
  }, [user, openTrades, fetchTrades]);

  // Check and auto-close trades based on TP/SL/Expiry - runs frequently for instant closure
  const checkAndCloseTrades = useCallback(async (currentPrice: number) => {
    if (!user || openTrades.length === 0) return;

    const now = new Date();
    const tradesToClose: { trade: ForexTrade; closeReason: ForexTrade['status'] }[] = [];

    // First, identify all trades that should close
    for (const trade of openTrades) {
      let closeReason: ForexTrade['status'] | null = null;
      
      // Check take profit - INSTANT close
      if (currentPrice >= trade.take_profit) {
        closeReason = 'closed_tp';
      }
      // Check stop loss - INSTANT close
      else if (currentPrice <= trade.stop_loss) {
        closeReason = 'closed_sl';
      }
      // Check expiry
      else if (new Date(trade.expires_at) <= now) {
        closeReason = 'closed_expired';
      }

      if (closeReason) {
        tradesToClose.push({ trade, closeReason });
      }
    }

    // Process all closures
    for (const { trade, closeReason } of tradesToClose) {
      const exitPrice = closeReason === 'closed_tp' ? trade.take_profit :
                        closeReason === 'closed_sl' ? trade.stop_loss : currentPrice;
      
      const priceChange = (exitPrice - trade.entry_price) / trade.entry_price;
      const profitLoss = trade.amount * priceChange;
      const finalAmount = trade.amount + profitLoss;

      // Update trade immediately
      await supabase
        .from('forex_trades')
        .update({
          exit_price: exitPrice,
          status: closeReason,
          profit_loss: profitLoss,
          closed_at: new Date().toISOString(),
        })
        .eq('id', trade.id);

      // Update wallet - credit the user with their funds
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        const newBalance = Number(wallet.balance) + finalAmount;
        const newProfit = profitLoss > 0 ? Number(wallet.total_profit) + profitLoss : Number(wallet.total_profit);
        const newLoss = profitLoss < 0 ? Number(wallet.total_loss) + Math.abs(profitLoss) : Number(wallet.total_loss);

        await supabase
          .from('wallets')
          .update({
            balance: newBalance,
            total_profit: newProfit,
            total_loss: newLoss,
          })
          .eq('user_id', user.id);
      }

      // Record transaction with clear description
      const reasonLabel = closeReason === 'closed_tp' ? 'Take Profit Hit' :
                          closeReason === 'closed_sl' ? 'Stop Loss Hit' : 'Trade Expired';
      
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: profitLoss >= 0 ? 'trade_profit' : 'trade_loss',
          amount: finalAmount,
          description: `${reasonLabel} at $${exitPrice.toFixed(2)}: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}`,
        });
    }

    if (tradesToClose.length > 0) {
      await fetchTrades();
    }
  }, [user, openTrades, fetchTrades]);

  // Calculate unrealized P/L for open trades
  const calculateUnrealizedPL = useCallback((currentPrice: number) => {
    return openTrades.reduce((total, trade) => {
      const priceChange = (currentPrice - trade.entry_price) / trade.entry_price;
      return total + (trade.amount * priceChange);
    }, 0);
  }, [openTrades]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('forex_trades_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forex_trades', filter: `user_id=eq.${user.id}` },
        () => {
          fetchTrades();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, fetchTrades]);

  return {
    trades,
    openTrades,
    loading,
    openTrade,
    closeTrade,
    checkAndCloseTrades,
    calculateUnrealizedPL,
    refetch: fetchTrades,
  };
};
