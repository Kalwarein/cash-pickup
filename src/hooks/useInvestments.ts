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
  final_value: number | null;
  final_profit_loss: number | null;
  maturity_cpr: number | null;
  status: string;
  created_at: string;
  maturity_days: number;
  maturity_date: string;
  is_matured: boolean;
  is_claimed: boolean;
  matured_at: string | null;
  claimed_at: string | null;
}

export const useInvestments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [maturedInvestments, setMaturedInvestments] = useState<Investment[]>([]);
  const [claimedInvestments, setClaimedInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;

    // Fetch active investments (not matured yet)
    const { data: activeData, error: activeError } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          ticker,
          risk_level
        )
      `)
      .eq('user_id', user.id)
      .eq('is_matured', false)
      .order('created_at', { ascending: false });

    if (!activeError && activeData) {
      setInvestments(activeData.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.companies?.name,
        company_ticker: inv.companies?.ticker,
        amount: Number(inv.amount),
        current_value: Number(inv.current_value),
        profit_loss: Number(inv.profit_loss),
        final_value: inv.final_value ? Number(inv.final_value) : null,
        final_profit_loss: inv.final_profit_loss ? Number(inv.final_profit_loss) : null,
        maturity_cpr: inv.maturity_cpr ? Number(inv.maturity_cpr) : null,
        status: inv.status,
        created_at: inv.created_at,
        maturity_days: inv.maturity_days || 7,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: inv.is_matured || false,
        is_claimed: inv.is_claimed || false,
        matured_at: inv.matured_at,
        claimed_at: inv.claimed_at,
      })));
    }

    // Fetch matured but unclaimed investments
    const { data: maturedData, error: maturedError } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          ticker
        )
      `)
      .eq('user_id', user.id)
      .eq('is_matured', true)
      .eq('is_claimed', false)
      .order('matured_at', { ascending: false });

    if (!maturedError && maturedData) {
      setMaturedInvestments(maturedData.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.companies?.name,
        company_ticker: inv.companies?.ticker,
        amount: Number(inv.amount),
        current_value: Number(inv.current_value),
        profit_loss: Number(inv.profit_loss),
        final_value: inv.final_value ? Number(inv.final_value) : null,
        final_profit_loss: inv.final_profit_loss ? Number(inv.final_profit_loss) : null,
        maturity_cpr: inv.maturity_cpr ? Number(inv.maturity_cpr) : null,
        status: inv.status,
        created_at: inv.created_at,
        maturity_days: inv.maturity_days || 7,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: true,
        is_claimed: false,
        matured_at: inv.matured_at,
        claimed_at: inv.claimed_at,
      })));
    }

    // Fetch claimed investments
    const { data: claimedData, error: claimedError } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          ticker
        )
      `)
      .eq('user_id', user.id)
      .eq('is_claimed', true)
      .order('claimed_at', { ascending: false })
      .limit(20);

    if (!claimedError && claimedData) {
      setClaimedInvestments(claimedData.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.companies?.name,
        company_ticker: inv.companies?.ticker,
        amount: Number(inv.amount),
        current_value: Number(inv.current_value),
        profit_loss: Number(inv.profit_loss),
        final_value: inv.final_value ? Number(inv.final_value) : null,
        final_profit_loss: inv.final_profit_loss ? Number(inv.final_profit_loss) : null,
        maturity_cpr: inv.maturity_cpr ? Number(inv.maturity_cpr) : null,
        status: inv.status,
        created_at: inv.created_at,
        maturity_days: inv.maturity_days || 7,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: true,
        is_claimed: true,
        matured_at: inv.matured_at,
        claimed_at: inv.claimed_at,
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

    // Get company info for risk-based calculations
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (!company) return { error: 'Company not found' };

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
        is_claimed: false,
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
        description: `Investment in ${company.name} (${maturityDays} days)`,
      });

    await fetchInvestments();
    return { error: null };
  }, [user, fetchInvestments]);

  // Check and mature investments that have reached maturity date
  const checkAndMatureInvestments = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const investmentsToMature = investments.filter(inv => 
      !inv.is_matured && new Date(inv.maturity_date) <= now
    );

    for (const inv of investmentsToMature) {
      // Get company CPR for final calculation
      const { data: company } = await supabase
        .from('companies')
        .select('cpr_today, name')
        .eq('id', inv.company_id)
        .single();

      if (!company) continue;

      const cprToday = Number(company.cpr_today) || 0;
      const multiplier = 1 + (cprToday / 100);
      const finalValue = Math.max(0, inv.amount * multiplier);
      const finalProfitLoss = finalValue - inv.amount;

      // Update investment as matured (but NOT claimed yet)
      await supabase
        .from('investments')
        .update({
          current_value: finalValue,
          profit_loss: finalProfitLoss,
          final_value: finalValue,
          final_profit_loss: finalProfitLoss,
          maturity_cpr: cprToday,
          is_matured: true,
          matured_at: new Date().toISOString(),
          status: 'matured', // Changed from 'closed' to 'matured'
          // is_claimed stays false - user must click Claim
        })
        .eq('id', inv.id);
    }

    if (investmentsToMature.length > 0) {
      await fetchInvestments();
    }
  }, [user, investments, fetchInvestments]);

  // Check for matured investments periodically
  useEffect(() => {
    const interval = setInterval(checkAndMatureInvestments, 30000);
    checkAndMatureInvestments(); // Initial check

    return () => clearInterval(interval);
  }, [checkAndMatureInvestments]);

  // Update current values periodically (for display only)
  useEffect(() => {
    const interval = setInterval(() => {
      setInvestments(prev => prev.map(inv => {
        if (inv.is_matured) return inv;
        
        const now = new Date();
        const maturityDate = new Date(inv.maturity_date);
        const createdDate = new Date(inv.created_at);
        
        const totalDuration = maturityDate.getTime() - createdDate.getTime();
        const elapsed = now.getTime() - createdDate.getTime();
        const progress = Math.min(1, elapsed / totalDuration);
        
        const maturityBonus = inv.maturity_days >= 60 ? 0.12 : inv.maturity_days >= 30 ? 0.06 : 0;
        const baseChange = (Math.random() - 0.45 + maturityBonus) * 5;
        const changePercent = baseChange * (0.5 + progress * 0.5);
        
        const valueChange = inv.current_value * (changePercent / 100);
        const newValue = Math.max(inv.amount * 0.4, inv.current_value + valueChange);
        const newProfitLoss = newValue - inv.amount;
        
        return {
          ...inv,
          current_value: Math.round(newValue * 100) / 100,
          profit_loss: Math.round(newProfitLoss * 100) / 100,
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // For backwards compatibility
  const completedInvestments = claimedInvestments;

  return { 
    investments, 
    maturedInvestments, // Matured but unclaimed
    claimedInvestments,
    completedInvestments, // Alias for claimedInvestments
    loading, 
    createInvestment, 
    refetch: fetchInvestments 
  };
};
