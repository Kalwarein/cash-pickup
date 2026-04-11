import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useInvestments } from '@/hooks/useInvestments';
import { useWallet } from '@/hooks/useWallet';
import { ClaimInvestmentCard } from '@/components/ClaimInvestmentCard';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { 
  Coins, TrendingUp, TrendingDown, Clock, CheckCircle, 
  Sparkles, Filter, ChevronDown 
} from 'lucide-react';

type EarnFilter = 'all' | 'active' | 'matured' | 'claimed';

const Earn = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { investments, maturedInvestments, claimedInvestments, refetch: refetchInvestments } = useInvestments();
  const { refetch: refetchWallet } = useWallet();
  const [filter, setFilter] = useState<EarnFilter>('all');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  const allInvestments = [
    ...investments.map(i => ({ ...i, _type: 'active' as const })),
    ...(maturedInvestments || []).map(i => ({ ...i, _type: 'matured' as const })),
    ...claimedInvestments.map(i => ({ ...i, _type: 'claimed' as const })),
  ] as Array<typeof investments[0] & { _type: 'active' | 'matured' | 'claimed' }>;

  const filtered = filter === 'all' ? allInvestments 
    : allInvestments.filter(i => i._type === filter);

  const totalEarned = claimedInvestments.reduce((s, i) => s + (i.final_profit_loss || 0), 0);
  const totalActive = investments.reduce((s, i) => s + i.current_value, 0);
  const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
  const pendingClaims = maturedInvestments?.length || 0;

  const handleClaimed = () => {
    refetchInvestments();
    refetchWallet();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 animate-fade-in">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Earn</h1>
              <p className="text-xs text-muted-foreground">Track all your investments & earnings</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Total Earned</p>
            <p className={cn("text-xl font-bold", totalEarned >= 0 ? "text-success" : "text-destructive")}>
              {totalEarned >= 0 ? '+' : ''}{sle(totalEarned)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Active Value</p>
            <p className="text-xl font-bold">{sle(totalActive)}</p>
            <p className="text-[10px] text-muted-foreground">of {sle(totalInvested)} invested</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-primary" />
              <p className="text-[10px] text-muted-foreground">Active</p>
            </div>
            <p className="text-lg font-bold">{investments.length}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <p className="text-[10px] text-muted-foreground">To Claim</p>
            </div>
            <p className="text-lg font-bold text-amber-500">{pendingClaims}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All', count: allInvestments.length },
            { key: 'active', label: 'Active', count: investments.length },
            { key: 'matured', label: 'Ready', count: pendingClaims },
            { key: 'claimed', label: 'Claimed', count: claimedInvestments.length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as EarnFilter)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              )}
            >
              {f.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px]",
                filter === f.key ? "bg-primary-foreground/20" : "bg-background"
              )}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Investment List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Coins className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No investments found</p>
              <button onClick={() => navigate('/invest')} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
                Start Investing
              </button>
            </div>
          ) : (
            filtered.map((inv) => {
              if (inv._type === 'matured') {
                return (
                  <ClaimInvestmentCard 
                    key={inv.id} 
                    investment={{
                      ...inv,
                      company_name: inv.company_name ?? null,
                      company_ticker: inv.company_ticker ?? null,
                    }} 
                    onClaimed={handleClaimed} 
                  />
                );
              }

              const invType = inv._type;
              const isClaimed = invType === 'claimed';
              const profitPercent = inv.amount > 0 ? ((isClaimed ? (inv.final_profit_loss || 0) : inv.profit_loss) / inv.amount) * 100 : 0;
              const displayPL = isClaimed ? (inv.final_profit_loss || 0) : inv.profit_loss;

              return (
                <div key={inv.id} className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {inv.company_ticker?.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.company_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{inv.company_ticker}</span>
                          <span>•</span>
                          <span>{inv.maturity_days}d</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full font-medium",
                            invType === 'active' ? "bg-blue-500/10 text-blue-500" :
                            isClaimed ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-500"
                          )}>
                            {invType === 'active' ? 'Active' : isClaimed ? 'Claimed' : 'Ready'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">
                        {sle(inv._type === 'claimed' ? (inv.final_value || inv.current_value) : inv.current_value)}
                      </p>
                      <p className={cn(
                        "text-xs font-medium",
                        displayPL >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {displayPL >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {invType === 'active' && (
                    <InvestmentProgressBar 
                      maturityDate={inv.maturity_date} 
                      maturityDays={inv.maturity_days} 
                      createdAt={inv.created_at} 
                      companyName={inv.company_name || ''} 
                      amount={inv.amount} 
                    />
                  )}

                  {isClaimed && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3" />
                      <span>Claimed {inv.claimed_at ? new Date(inv.claimed_at).toLocaleDateString() : ''}</span>
                      <span>•</span>
                      <span>Invested {sle(inv.amount)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Earn;