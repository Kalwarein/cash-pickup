import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Investment {
  id: string;
  company_id: string;
  company_name?: string;
  company_ticker?: string;
  amount: number;
  current_value: number;
  profit_loss: number;
  status: string;
  created_at: string;
}

export const useInvestments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          ticker
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvestments(data.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.companies?.name,
        company_ticker: inv.companies?.ticker,
        amount: Number(inv.amount),
        current_value: Number(inv.current_value),
        profit_loss: Number(inv.profit_loss),
        status: inv.status,
        created_at: inv.created_at,
      })));
    }
    setLoading(false);
  }, [user]);

  const createInvestment = useCallback(async (companyId: string, amount: number) => {
    if (!user) return { error: 'Not authenticated' };

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) return { error: 'Wallet not found' };
    if (Number(wallet.balance) < amount) return { error: 'Insufficient balance' };

    // Create investment
    const { error: investError } = await supabase
      .from('investments')
      .insert({
        user_id: user.id,
        company_id: companyId,
        amount,
        current_value: amount,
        profit_loss: 0,
        status: 'active',
      });

    if (investError) return { error: investError.message };

    // Update wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        balance: Number(wallet.balance) - amount,
        invested_amount: Number(wallet.invested_amount) + amount,
      })
      .eq('user_id', user.id);

    if (updateError) return { error: updateError.message };

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'investment',
        amount,
        description: 'Investment in company',
      });

    await fetchInvestments();
    return { error: null };
  }, [user, fetchInvestments]);

  // Simulate investment value changes
  useEffect(() => {
    const interval = setInterval(() => {
      setInvestments(prev => prev.map(inv => {
        // Random change between -3% and +4%
        const changePercent = (Math.random() - 0.45) * 7;
        const valueChange = inv.current_value * (changePercent / 100);
        const newValue = Math.max(inv.amount * 0.5, inv.current_value + valueChange);
        const newProfitLoss = newValue - inv.amount;
        
        return {
          ...inv,
          current_value: Math.round(newValue * 100) / 100,
          profit_loss: Math.round(newProfitLoss * 100) / 100,
        };
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  return { investments, loading, createInvestment, refetch: fetchInvestments };
};
