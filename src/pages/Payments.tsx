import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PaymentTransactionDetails } from '@/components/PaymentTransactionDetails';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { PaymentTransaction, usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import {
  PaymentStatusFilter,
  PROVIDER_LABELS,
  getPaymentBadge,
  getPaymentExpiry,
  getResolvedPaymentStatus,
  matchesPaymentStatusFilter,
} from '@/lib/paymentTransactions';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { PageLoader } from '@/components/PageLoader';

const FILTERS: Array<{ key: PaymentStatusFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'expired', label: 'Expired' },
];

const Payments = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const { paymentTransactions, loading: paymentsLoading, refetch } = usePaymentTransactions();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PaymentStatusFilter>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (!loading && !onboardingLoading && user && completed === false) {
      navigate('/onboarding');
    }
  }, [user, loading, completed, onboardingLoading, navigate]);

  const counts = useMemo(() => {
    return paymentTransactions.reduce<Record<Exclude<PaymentStatusFilter, 'all'>, number>>((acc, tx) => {
      acc[getResolvedPaymentStatus(tx)] += 1;
      return acc;
    }, { pending: 0, completed: 0, failed: 0, expired: 0 });
  }, [paymentTransactions]);

  const filteredTransactions = useMemo(
    () => paymentTransactions.filter((tx) => matchesPaymentStatusFilter(tx, filter)),
    [filter, paymentTransactions],
  );

  if (loading || onboardingLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
          <PageLoader inline label="Loading payments…" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 animate-fade-in">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/wallet')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card/70"
              aria-label="Back to profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight">Payments</h1>
              <p className="text-sm text-muted-foreground">Deposit and withdrawal history</p>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card/70"
            aria-label="Refresh payments"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Total requests</p>
            <p className="mt-1 text-2xl font-bold">{paymentTransactions.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Still pending</p>
            <p className="mt-1 text-2xl font-bold text-primary">{counts.pending}</p>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => {
            const count = item.key === 'all'
              ? paymentTransactions.length
              : counts[item.key];

            return (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                  filter === item.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label} · {count}
              </button>
            );
          })}
        </div>

        <div className="flex-1 space-y-3">
          {paymentsLoading ? (
            <div className="glass-card p-6 text-center text-sm text-muted-foreground">Loading payment history...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">No {filter === 'all' ? '' : filter} payment requests yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Deposit or withdraw from your wallet to see transactions here.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const badge = getPaymentBadge(tx);
              const provider = tx.provider ? (PROVIDER_LABELS[tx.provider] || tx.provider) : 'Mobile Money';
              const expiresAt = getPaymentExpiry(tx);

              return (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="w-full rounded-3xl border border-border/60 bg-card/70 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold capitalize">{tx.type} via {provider}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.reference || tx.monime_payment_code_id || tx.monime_payout_id || 'Payment transaction'}
                      </p>
                    </div>
                    <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', badge.className)}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{sle(tx.amount)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      <p>{tx.ussd_code || tx.phone_number || 'No code available'}</p>
                      <p>{expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : 'Tap for full details'}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </main>

      <PaymentTransactionDetails
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
      <BottomNav />
    </div>
  );
};

export default Payments;