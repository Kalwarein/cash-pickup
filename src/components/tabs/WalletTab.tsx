import { useState } from 'react';
import { User, Wallet, TrendingUp, TrendingDown, Award, LogOut, Gift, Building2, Plus, Minus, Clock, Sparkles, CheckCircle, History } from 'lucide-react';
import { TransactionItem } from '@/components/TransactionItem';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { ClaimInvestmentCard } from '@/components/ClaimInvestmentCard';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { sle, formatSLE } from '@/lib/currency';

export const WalletTab = () => {
  const { wallet, transactions, loading, refetch: refetchWallet } = useWallet();
  const { investments, maturedInvestments, claimedInvestments, refetch: refetchInvestments } = useInvestments();
  const { getActivePromoCodes, userPromoCodes } = usePromoCodes();
  const { profile } = useProfile();
  const activePromoCodes = getActivePromoCodes();
  const completedInvestments = claimedInvestments;
  const { signOut } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showAllInvestments, setShowAllInvestments] = useState(false);

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const netProfitLoss = completedInvestments.reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);
  const profitableInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) > 0).length;
  const lossInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) < 0).length;
  const winRate = completedInvestments.length > 0 ? (profitableInvestments / completedInvestments.length) * 100 : 0;

  const handleClaimed = () => {
    refetchInvestments();
    refetchWallet();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 h-40 loading-pulse" />
        <div className="glass-card p-4 h-20 loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-4">
      {/* Profile Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-float">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight">{profile?.name || 'User'}</h1>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Premium Balance Hero */}
      <div className="mx-4 relative overflow-hidden rounded-2xl p-6 text-primary-foreground shadow-float gradient-primary">
        <span className="pointer-events-none absolute -top-16 -right-10 w-44 h-44 rounded-full bg-white/15 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-8 w-48 h-48 rounded-full bg-black/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm text-primary-foreground/80 mb-1">Available Balance</p>
          <p className="text-4xl font-display font-bold tabular-nums tracking-tight mb-4">{sle(wallet?.balance || 0)}</p>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
            <div>
              <p className="text-[10px] text-primary-foreground/70 mb-0.5">Invested</p>
              <p className="text-sm font-semibold tabular-nums">{sle(wallet?.invested_amount || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-primary-foreground/70 mb-0.5">Net P/L</p>
              <p className="text-sm font-semibold tabular-nums">
                {netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-primary-foreground/70 mb-0.5">Win Rate</p>
              <p className="text-sm font-semibold tabular-nums">{winRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit/Withdraw */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <button onClick={() => setDepositModalOpen(true)} className="glass-card p-4 flex items-center justify-center gap-2 hover:bg-success/10 transition-all duration-200 active:scale-[0.97] group">
          <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4 text-success" />
          </div>
          <span className="font-semibold text-sm">Deposit</span>
        </button>
        <button onClick={() => setWithdrawModalOpen(true)} className="glass-card p-4 flex items-center justify-center gap-2 hover:bg-primary/10 transition-all duration-200 active:scale-[0.97] group">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Minus className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">Withdraw</span>
        </button>
      </div>

      {/* Matured Investments - Claim Section */}
      {maturedInvestments && maturedInvestments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-success animate-pulse" />
            <h3 className="font-semibold">Ready to Claim</h3>
            <span className="ml-auto text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">
              {maturedInvestments.length} ready
            </span>
          </div>
          <div className="space-y-3">
            {maturedInvestments.map((inv) => (
              <ClaimInvestmentCard key={inv.id} investment={{
                ...inv,
                company_name: inv.company_name ?? null,
                company_ticker: inv.company_ticker ?? null,
              }} onClaimed={handleClaimed} />
            ))}
          </div>
        </div>
      )}

      {/* Active Investments */}
      {investments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Active Investments</h3>
            <span className="ml-auto text-xs text-muted-foreground">{investments.length} active</span>
          </div>
          <div className="space-y-3">
            {investments.slice(0, showAllInvestments ? undefined : 3).map((inv) => (
              <div key={inv.id} className="p-3 bg-muted/50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">{inv.company_ticker?.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{inv.company_name}</p>
                      <p className="text-[10px] text-muted-foreground">{sle(inv.amount)} • {inv.maturity_days}d</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{sle(inv.current_value)}</p>
                    <p className={cn("text-xs", inv.profit_loss >= 0 ? "text-success" : "text-destructive")}>
                      {inv.profit_loss >= 0 ? '+' : ''}{formatSLE(Math.abs(inv.profit_loss), true)}
                    </p>
                  </div>
                </div>
                <InvestmentProgressBar maturityDate={inv.maturity_date} maturityDays={inv.maturity_days} createdAt={inv.created_at} companyName={inv.company_name || ''} amount={inv.amount} />
              </div>
            ))}
            {investments.length > 3 && (
              <button onClick={() => setShowAllInvestments(!showAllInvestments)} className="w-full text-center text-xs text-primary font-medium py-1">
                {showAllInvestments ? 'Show Less' : `Show All ${investments.length}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completed / Claimed Investments */}
      {completedInvestments.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold">Completed Investments</h3>
            <span className={cn("ml-auto text-xs font-medium", netProfitLoss >= 0 ? "text-success" : "text-destructive")}>
              {netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)} net
            </span>
          </div>
          <div className="space-y-2">
            {completedInvestments.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", (inv.final_profit_loss || 0) >= 0 ? "bg-success/20" : "bg-destructive/20")}>
                    {(inv.final_profit_loss || 0) >= 0 ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{inv.company_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.claimed_at ? new Date(inv.claimed_at).toLocaleDateString() : 'Claimed'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{sle(inv.amount)}</p>
                  <p className={cn("font-semibold text-sm", (inv.final_profit_loss || 0) >= 0 ? "text-success" : "text-destructive")}>
                    {(inv.final_profit_loss || 0) >= 0 ? '+' : ''}{sle(Math.abs(inv.final_profit_loss || 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Transactions</h3>
        </div>
        {transactions.length > 0 ? (
          <div>
            {transactions.slice(0, showAllTransactions ? 20 : 5).map((tx) => (
              <TransactionItem key={tx.id} type={tx.type} amount={Number(tx.amount)} description={tx.description || ''} date={tx.created_at} />
            ))}
            {transactions.length > 5 && (
              <button onClick={() => setShowAllTransactions(!showAllTransactions)} className="w-full text-center text-xs text-primary font-medium py-2">
                {showAllTransactions ? 'Show Less' : `View All Transactions`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 text-sm">No transactions yet</p>
        )}
      </div>

      {/* Promo Codes */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">My Promo Codes</h3>
          </div>
          {activePromoCodes.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-medium">{activePromoCodes.length} active</span>
          )}
        </div>
        {userPromoCodes.length > 0 ? (
          <div className="space-y-2">
            {userPromoCodes.map((upc) => {
              const isExpired = new Date(upc.expires_at) < new Date();
              const isActive = upc.is_active && !isExpired;
              return (
                <div key={upc.id} className={cn("p-3 rounded-xl border transition-all", isActive ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-border opacity-60")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-medium text-sm">{upc.promo_code?.name || upc.promo_code?.code}</span>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", isActive ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                      {isActive ? 'Active' : isExpired ? 'Expired' : 'Used'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{upc.promo_code?.description}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{isExpired ? 'Expired' : `Expires ${new Date(upc.expires_at).toLocaleDateString()}`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No promo codes yet</p>
        )}
      </div>

      {/* Performance Stats */}
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">Performance</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className={cn("p-3 rounded-xl", netProfitLoss >= 0 ? "bg-success/10" : "bg-destructive/10")}>
            {netProfitLoss >= 0 ? <TrendingUp className="w-4 h-4 text-success mb-1" /> : <TrendingDown className="w-4 h-4 text-destructive mb-1" />}
            <p className="text-[10px] text-muted-foreground">Net P/L</p>
            <p className={cn("text-lg font-bold", netProfitLoss >= 0 ? "text-success" : "text-destructive")}>
              {netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-xl">
            <Award className="w-4 h-4 text-primary mb-1" />
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold text-primary">{winRate.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{profitableInvestments}W / {lossInvestments}L</p>
          </div>
        </div>
      </div>

      {/* Account & Sign Out */}
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total Investments</span><span>{investments.length + completedInvestments.length}</span></div>
        </div>
      </div>

      <button onClick={signOut} className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors">
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </button>

      {/* Modals */}
      <DepositWithdrawModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} type="deposit" balance={wallet?.balance || 0} />
      <DepositWithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} type="withdraw" balance={wallet?.balance || 0} />
    </div>
  );
};
