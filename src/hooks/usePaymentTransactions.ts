import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string | null;
  provider: string | null;
  phone_number: string | null;
  ussd_code: string | null;
  monime_payment_code_id: string | null;
  monime_payout_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const usePaymentTransactions = () => {
  const { user } = useAuth();
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaymentTransactions = useCallback(async () => {
    if (!user) {
      setPaymentTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(25);

    if (!error && data) {
      setPaymentTransactions(data.map((tx) => ({
        id: tx.id,
        user_id: tx.user_id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        reference: tx.reference,
        provider: tx.provider,
        phone_number: tx.phone_number,
        ussd_code: tx.ussd_code,
        monime_payment_code_id: tx.monime_payment_code_id,
        monime_payout_id: tx.monime_payout_id,
        metadata: tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
          ? (tx.metadata as Record<string, unknown>)
          : null,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
      })));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPaymentTransactions();
  }, [fetchPaymentTransactions]);

  // Realtime: refresh whenever Monime webhook updates payment_transactions for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`payment_tx_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions', filter: `user_id=eq.${user.id}` },
        () => { fetchPaymentTransactions(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPaymentTransactions]);

  return { paymentTransactions, loading, refetch: fetchPaymentTransactions };
};