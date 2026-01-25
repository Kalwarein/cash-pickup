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
  status: string;
  created_at: string;
  maturity_days: number;
  maturity_date: string;
  is_matured: boolean;
  matured_at: string | null;
}

export const useInvestments = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [completedInvestments, setCompletedInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;

    // Fetch active investments
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
      .eq('status', 'active')
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
        status: inv.status,
        created_at: inv.created_at,
        maturity_days: inv.maturity_days || 30,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: inv.is_matured || false,
        matured_at: inv.matured_at,
      })));
    }

    // Fetch completed investments
    const { data: completedData, error: completedError } = await supabase
      .from('investments')
      .select(`
        *,
        companies (
          name,
          ticker
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('matured_at', { ascending: false })
      .limit(20);

    if (!completedError && completedData) {
      setCompletedInvestments(completedData.map(inv => ({
        id: inv.id,
        company_id: inv.company_id,
        company_name: inv.companies?.name,
        company_ticker: inv.companies?.ticker,
        amount: Number(inv.amount),
        current_value: Number(inv.current_value),
        profit_loss: Number(inv.profit_loss),
        final_value: inv.final_value ? Number(inv.final_value) : null,
        final_profit_loss: inv.final_profit_loss ? Number(inv.final_profit_loss) : null,
        status: inv.status,
        created_at: inv.created_at,
        maturity_days: inv.maturity_days || 30,
        maturity_date: inv.maturity_date || inv.created_at,
        is_matured: true,
        matured_at: inv.matured_at,
      })));
    }

    setLoading(false);
  }, [user]);

  const createInvestment = useCallback(async (companyId: string, amount: number, maturityDays: number = 30) => {
    if (!user) return { error: 'Not authenticated' };

    // Enforce minimum 30 days for long-term investments
    const finalMaturityDays = Math.max(30, maturityDays);

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
    maturityDate.setDate(maturityDate.getDate() + finalMaturityDays);

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
        maturity_days: finalMaturityDays,
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

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'investment',
        amount,
        description: `Investment in ${company.name} (${finalMaturityDays} days)`,
      });

    await fetchInvestments();
    return { error: null };
  }, [user, fetchInvestments]);

  // Mature investment and calculate final value based on CPR
  const matureInvestment = useCallback(async (investmentId: string) => {
    if (!user) return { error: 'Not authenticated' };

    const investment = investments.find(i => i.id === investmentId);
    if (!investment) return { error: 'Investment not found' };

    // Get company for CPR-based calculation
    const { data: company } = await supabase
      .from('companies')
      .select('cpr_today, name')
      .eq('id', investment.company_id)
      .single();

    if (!company) return { error: 'Company not found' };

    // Use the company's current CPR to determine outcome
    const cprToday = Number(company.cpr_today) || 0;
    
    // Calculate final value based on CPR
    // CPR ranges from -90% to +50%
    const multiplier = 1 + (cprToday / 100);
    const finalValue = Math.max(0, investment.amount * multiplier);
    const finalProfitLoss = finalValue - investment.amount;

    // Update investment
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
        status: 'closed',
      })
      .eq('id', investmentId);

    // Update wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (wallet) {
      const newBalance = Number(wallet.balance) + finalValue;
      const newInvested = Math.max(0, Number(wallet.invested_amount) - investment.amount);
      const newProfit = finalProfitLoss > 0 ? Number(wallet.total_profit) + finalProfitLoss : Number(wallet.total_profit);
      const newLoss = finalProfitLoss < 0 ? Number(wallet.total_loss) + Math.abs(finalProfitLoss) : Number(wallet.total_loss);

      await supabase
        .from('wallets')
        .update({
          balance: newBalance,
          invested_amount: newInvested,
          total_profit: newProfit,
          total_loss: newLoss,
        })
        .eq('user_id', user.id);
    }

    // Record transaction
    const transactionType = finalProfitLoss >= 0 ? 'investment_profit' : 'investment_loss';
    const resultText = finalProfitLoss >= 0 ? `+${finalProfitLoss.toFixed(2)}` : `${finalProfitLoss.toFixed(2)}`;
    
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: transactionType,
        amount: finalValue,
        description: `${investment.company_name} matured: ${resultText} SLE (CPR: ${cprToday >= 0 ? '+' : ''}${cprToday}%)`,
      });

    await fetchInvestments();
    return { error: null, finalValue, finalProfitLoss };
  }, [user, investments, fetchInvestments]);

  // Check for matured investments periodically
  useEffect(() => {
    const checkMatured = async () => {
      const now = new Date();
      const maturedInvestments = investments.filter(inv => 
        !inv.is_matured && new Date(inv.maturity_date) <= now
      );

      for (const inv of maturedInvestments) {
        await matureInvestment(inv.id);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkMatured, 30000);
    checkMatured(); // Initial check

    return () => clearInterval(interval);
  }, [investments, matureInvestment]);

  // Update current values periodically (for display only, not persisted until maturity)
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
        
        // Simulate gradual change toward final outcome
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

  return { 
    investments, 
    completedInvestments,
    loading, 
    createInvestment, 
    matureInvestment,
    refetch: fetchInvestments 
  };
};
