import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp, TrendingDown, Clock, CheckCircle2, Filter } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments } from '@/hooks/useInvestments';
import { sle } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';

type Tab = 'active' | 'matured' | 'claimed';

const Investments = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { investments, maturedInvestments, claimedInvestments, loading } = useInvestments();
  const [tab, setTab] = useState<Tab>('active');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const list = useMemo(() => {
    if (tab === 'active') return investments;
    if (tab === 'matured') return maturedInvestments;
    return claimedInvestments;
  }, [tab, investments, maturedInvestments, claimedInvestments]);

  const totals = useMemo(() => {
    const invested = investments.reduce((s, i) => s + i.amount, 0);
    const currentValue = investments.reduce((s, i) => s + i.current_value, 0);
    const pl = currentValue - invested;
    return { invested, currentValue, pl };
  }, [investments]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
          <PageLoader inline />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/70 border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted active:scale-90 transition-transform">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-display font-bold">My Investments</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4 animate-fade-in">
        {/* Portfolio hero */}
        <section className="rounded-2xl p-4 bg-card/60 backdrop-blur-md border border-border/50 shadow-float">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Invested</p>
          <p className="text-2xl font-display font-black tabular-nums">{sle(totals.invested)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current Value</p>
              <p className="text-sm font-bold tabular-nums">{sle(totals.currentValue)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Unrealized P/L</p>
              <p className={cn('text-sm font-bold tabular-nums', totals.pl >= 0 ? 'text-success' : 'text-destructive')}>
                {totals.pl >= 0 ? '+' : ''}{sle(totals.pl)}
              </p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-card/60 backdrop-blur-md border border-border/50">
          {([
            { k: 'active', label: 'Active', icon: Clock, count: investments.length },
            { k: 'matured', label: 'Matured', icon: TrendingUp, count: maturedInvestments.length },
            { k: 'claimed', label: 'Claimed', icon: CheckCircle2, count: claimedInvestments.length },
          ] as { k: Tab; label: string; icon: typeof Clock; count: number }[]).map(({ k, label, icon: Icon, count }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-all',
                tab === k ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60',
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', tab === k ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {list.length === 0 ? (
          <div className="rounded-2xl p-8 bg-card/40 backdrop-blur-md border border-border/50 text-center">
            <Filter className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="font-semibold">No {tab} investments</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === 'active' ? 'Start investing to see your positions here.' : 'Nothing here yet.'}
            </p>
            {tab === 'active' && (
              <button
                onClick={() => navigate('/invest')}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                Explore companies
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((inv) => {
              const finalPl = inv.final_profit_loss ?? inv.profit_loss;
              const up = finalPl >= 0;
              const pct = inv.amount > 0 ? (finalPl / inv.amount) * 100 : 0;
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl p-4 bg-card/60 backdrop-blur-md border border-border/50 shadow-card active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{inv.company_name || 'Company'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {inv.company_ticker} · {inv.maturity_days}d term
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{sle(inv.amount)}</p>
                      <p className={cn('text-[11px] font-semibold flex items-center justify-end gap-0.5 tabular-nums',
                        up ? 'text-success' : 'text-destructive')}>
                        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {up ? '+' : ''}{pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  {tab === 'active' && (
                    <div className="mt-3">
                      <InvestmentProgressBar
                        createdAt={inv.created_at}
                        maturityDate={inv.maturity_date}
                        isMatured={inv.is_matured}
                      />
                    </div>
                  )}
                  {tab !== 'active' && (
                    <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Final Value</p>
                        <p className="text-sm font-bold tabular-nums">{sle(inv.final_value ?? inv.current_value)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">P/L</p>
                        <p className={cn('text-sm font-bold tabular-nums', up ? 'text-success' : 'text-destructive')}>
                          {up ? '+' : ''}{sle(finalPl)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Investments;