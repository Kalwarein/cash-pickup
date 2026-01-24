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
  maturity_days: number;
  maturity_date: string;
  is_matured: boolean;
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
        maturity_days: inv.maturity_days || 7,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: inv.is_matured || false,
      })));
    }
    setLoading(false);
  }, [user]);

  const createInvestment = useCallback(async (companyId: string, amount: number, maturityDays: number = 7) => {
    if (!user) return { error: 'Not authenticated' };

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) return { error: 'Wallet not found' };
    if (Number(wallet.balance) < amount) return { error: 'Insufficient balance' };

    // Calculate maturity date
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + maturityDays);

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
        maturity_days: maturityDays,
        maturity_date: maturityDate.toISOString(),
        is_matured: false,
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

    // Get company name for transaction description
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'investment',
        amount,
        description: `Investment in ${company?.name || 'company'} (${maturityDays} days)`,
      });

    await fetchInvestments();
    return { error: null };
  }, [user, fetchInvestments]);

  // Simulate investment value changes based on maturity
  useEffect(() => {
    const interval = setInterval(() => {
      setInvestments(prev => prev.map(inv => {
        const now = new Date();
        const maturityDate = new Date(inv.maturity_date);
        const createdDate = new Date(inv.created_at);
        
        // Calculate progress towards maturity (0 to 1)
        const totalDuration = maturityDate.getTime() - createdDate.getTime();
        const elapsed = now.getTime() - createdDate.getTime();
        const progress = Math.min(1, elapsed / totalDuration);
        
        // Longer maturity = better chance of profit
        const maturityBonus = inv.maturity_days >= 30 ? 0.15 : inv.maturity_days >= 14 ? 0.05 : -0.1;
        
        // Random change with bias based on maturity
        const baseChange = (Math.random() - 0.45 + maturityBonus) * 7;
        const changePercent = baseChange * (1 + progress * 0.5); // More volatile near end
        
        const valueChange = inv.current_value * (changePercent / 100);
        const newValue = Math.max(inv.amount * 0.3, inv.current_value + valueChange);
        const newProfitLoss = newValue - inv.amount;
        
        // Check if matured
        const isNowMatured = now >= maturityDate;
        
        return {
          ...inv,
          current_value: Math.round(newValue * 100) / 100,
          profit_loss: Math.round(newProfitLoss * 100) / 100,
          is_matured: isNowMatured,
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
