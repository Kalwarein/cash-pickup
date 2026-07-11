import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useProfile } from '@/hooks/useProfile';
import { usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import { ClaimInvestmentCard } from '@/components/ClaimInvestmentCard';
import { Money } from '@/components/wallet/Money';
import { PageLoader } from '@/components/PageLoader';
import { cn } from '@/lib/utils';
import {
  Settings, Plus, Minus, ArrowLeftRight, History, ArrowDownLeft, LifeBuoy,
  Sparkles, ChevronRight, Briefcase,
} from 'lucide-react';

const WalletProfile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { wallet, transactions, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { investments, maturedInvestments, claimedInvestments, loading: investmentsLoading, refetch: refetchInvestments } = useInvestments();
  const { getActivePromoCodes } = usePromoCodes();
  const { profile } = useProfile();
  const { paymentTransactions } = usePaymentTransactions();
  const activePromoCodes = getActivePromoCodes();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const stats = useMemo(() => {
    const completed = claimedInvestments;
    const unrealized = investments.reduce((s, i) => s + i.profit_loss, 0);
    const activeValue = investments.reduce((s, i) => s + i.current_value, 0);
    const invested = investments.reduce((s, i) => s + i.amount, 0);
    const lifetime = completed.reduce((s, i) => s + (i.final_profit_loss || 0), 0);
    const wins = completed.filter(i => (i.final_profit_loss || 0) > 0).length;
    const winRate = completed.length ? (wins / completed.length) * 100 : 0;
    const balance = wallet?.balance || 0;

    const today = new Date().toDateString();
    const todayPL = completed
      .filter(i => i.claimed_at && new Date(i.claimed_at).toDateString() === today)
      .reduce((s, i) => s + (i.final_profit_loss || 0), 0) + unrealized;

    const sumTx = (type: string, status: string) => paymentTransactions
      .filter(t => t.type === type && t.status === status)
      .reduce((s, t) => s + t.amount, 0);

    return {
      balance,
      portfolio: balance + activeValue,
      invested,
      unrealized,
      todayPL,
      lifetime,
      winRate,
      totalDeposits: sumTx('deposit', 'completed'),
      totalWithdrawals: sumTx('withdrawal', 'completed'),
      pendingWithdrawals: sumTx('withdrawal', 'pending'),
      referral: 0,
      promoBalance: activePromoCodes.length * 0,
    };
  }, [wallet, investments, claimedInvestments, paymentTransactions, activePromoCodes]);

  if (loading || walletLoading || investmentsLoading || !user)
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center"><PageLoader inline /></div>
        <BottomNav />
      </div>
    );

  const lastTx = transactions[0];
  const hasActive = investments.length > 0;

  const actions = [
    { label: 'Deposit', icon: Plus, tint: 'text-success', bg: 'bg-success/15', path: '/wallet/deposit' },
    { label: 'Withdraw', icon: Minus, tint: 'text-primary', bg: 'bg-primary/15', path: '/wallet/withdraw' },
    { label: 'Transfer', icon: ArrowLeftRight, tint: 'text-blue-500', bg: 'bg-blue-500/15', path: '/wallet/transfer' },
    { label: 'Request', icon: ArrowDownLeft, tint: 'text-teal-500', bg: 'bg-teal-500/15', path: '/wallet/request' },
    { label: 'History', icon: History, tint: 'text-pink-500', bg: 'bg-pink-500/15', path: '/wallet/history' },
    { label: 'Support', icon: LifeBuoy, tint: 'text-amber-500', bg: 'bg-amber-500/15', path: '/support' },
  ];

  const metrics: { label: string; value: number; sign?: boolean; pl?: boolean }[] = [
    { label: 'Invested Amount', value: stats.invested },
    { label: 'Unrealized P/L', value: stats.unrealized, sign: true, pl: true },
    { label: "Today's P/L", value: stats.todayPL, sign: true, pl: true },
    { label: 'Lifetime Profit', value: stats.lifetime, sign: true, pl: true },
    { label: 'Total Deposits', value: stats.totalDeposits },
    { label: 'Total Withdrawals', value: stats.totalWithdrawals },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals },
    { label: 'Referral Earnings', value: stats.referral },
    { label: 'Promo Balance', value: stats.promoBalance },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto animate-fade-in">
        {/* Hero header */}
        <div className="relative overflow-hidden gradient-primary px-5 pt-8 pb-8 shadow-float">
          <span className="pointer-events-none absolute -top-12 -right-10 w-44 h-44 rounded-full bg-white/15 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-black/10 blur-3xl" />
          <div className="relative flex items-center justify-between mb-7">
            <div>
              <p className="text-xs text-primary-foreground/70">Welcome back</p>
              <h1 className="text-xl font-display font-bold tracking-tight text-primary-foreground">{profile?.name || 'My Wallet'}</h1>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-primary-foreground active:scale-90 transition-transform shadow-sm"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <p className="text-xs text-primary-foreground/70 mb-1">Available Balance</p>
            <Money value={stats.balance} className="text-4xl font-display font-bold tracking-tight text-primary-foreground block" />
            <div className="mt-4 flex items-center gap-4 pt-4 border-t border-white/15">
              <div>
                <p className="text-[10px] text-primary-foreground/60">Total Portfolio Value</p>
                <Money value={stats.portfolio} className="text-sm font-bold text-primary-foreground" />
              </div>
              <div className="h-8 w-px bg-white/15" />
              <div>
                <p className="text-[10px] text-primary-foreground/60">Win Rate</p>
                <span className="text-sm font-bold text-primary-foreground tabular-nums">{stats.winRate.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4 -mt-4">
          {/* View My Investments */}
          {hasActive && (
            <button
              onClick={() => navigate('/invest')}
              className="w-full glass-card p-4 flex items-center gap-3 shadow-float hover:bg-muted/40 active:scale-[0.99] transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">View My Investments</p>
                <p className="text-[11px] text-muted-foreground">{investments.length} active · <Money value={stats.invested} decimals={0} /> deployed</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            {actions.map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className="glass-card p-4 flex flex-col items-center gap-2 rounded-2xl border border-border/40 shadow-sm hover:shadow-float hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all"
              >
                <span className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', a.bg)}>
                  <a.icon className={cn('w-[22px] h-[22px]', a.tint)} />
                </span>
                <span className="text-xs font-semibold">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Ready to claim */}
          {maturedInvestments && maturedInvestments.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-success animate-pulse" />
                <h3 className="font-semibold text-sm">Ready to Claim</h3>
                <span className="ml-auto text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">{maturedInvestments.length} ready</span>
              </div>
              <div className="space-y-3">
                {maturedInvestments.map(inv => (
                  <ClaimInvestmentCard
                    key={inv.id}
                    investment={{ ...inv, company_name: inv.company_name ?? null, company_ticker: inv.company_ticker ?? null }}
                    onClaimed={() => { refetchInvestments(); refetchWallet(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Metrics grid */}
          <div className="glass-card p-4">
            <h3 className="font-semibold text-sm mb-3">Account Overview</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {metrics.map(m => (
                <div key={m.label} className="rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                  <Money
                    value={m.value}
                    showSign={m.sign}
                    className={cn(
                      'text-sm font-bold',
                      m.pl && m.value > 0 && 'text-success',
                      m.pl && m.value < 0 && 'text-destructive',
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Last transaction */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">Last Transaction</h3>
              <button onClick={() => navigate('/wallet/history')} className="text-xs text-primary font-medium">View all</button>
            </div>
            {lastTx ? (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-medium capitalize">{lastTx.description || lastTx.type}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(lastTx.created_at).toLocaleString()}</p>
                </div>
                <span className={cn('text-sm font-bold tabular-nums', Number(lastTx.amount) >= 0 ? 'text-success' : 'text-destructive')}>
                  <Money value={Number(lastTx.amount)} showSign />
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No transactions yet</p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default WalletProfile;
