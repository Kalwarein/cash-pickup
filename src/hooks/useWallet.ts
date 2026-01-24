import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Wallet {
  id: string;
  balance: number;
  invested_amount: number;
  total_profit: number;
  total_loss: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setWallet({
        id: data.id,
        balance: Number(data.balance),
        invested_amount: Number(data.invested_amount),
        total_profit: Number(data.total_profit),
        total_loss: Number(data.total_loss),
      });
    }
    setLoading(false);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactions(data);
    }
  }, [user]);

  const deposit = useCallback(async (amount: number) => {
    if (!user || !wallet) return { error: 'No wallet found' };

    const newBalance = wallet.balance + amount;

    const { error: walletError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', user.id);

    if (walletError) return { error: walletError.message };

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount,
        description: 'Deposit to wallet',
      });

    if (txError) return { error: txError.message };

    await fetchWallet();
    await fetchTransactions();
    return { error: null };
  }, [user, wallet, fetchWallet, fetchTransactions]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  return { wallet, transactions, loading, deposit, refetch: fetchWallet };
};
