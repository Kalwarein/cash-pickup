import { useState } from 'react';
import { User, Wallet, TrendingUp, Award, LogOut, ArrowUpDown, Gift, Building2, ArrowDownLeft, ArrowUpRight, Plus, Minus } from 'lucide-react';
import { TransactionItem } from '@/components/TransactionItem';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { sle, formatSLE } from '@/lib/currency';

export const WalletTab = () => {
  const { wallet, transactions, loading, refetch: refetchWallet } = useWallet();
  const { investments, completedInvestments } = useInvestments();
  const { profile, updateViewPreference } = useProfile();
  const { signOut } = useAuth();
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Use database-persisted view preference
  const showProfile = profile?.wallet_view_preference === 'profile';

  const handleToggleView = () => {
    const newView = showProfile ? 'wallet' : 'profile';
    updateViewPreference(newView);
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  
  // Calculate only profits from completed investments (no losses shown)
  const totalProfit = completedInvestments
    .filter(inv => (inv.final_profit_loss || 0) > 0)
    .reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);
  
  const successfulInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) > 0).length;
  const winRate = completedInvestments.length > 0
    ? (successfulInvestments / completedInvestments.length) * 100
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 h-40 loading-pulse" />
        <div className="glass-card p-4 h-20 loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {showProfile ? 'Profile' : 'Wallet'}
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleToggleView}
            className="p-2 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Wallet View */}
      {!showProfile && (
        <>
          {/* Balance Card */}
          <div className="glass-card p-6 glow-primary">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="text-4xl font-bold">{sle(wallet?.balance || 0)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-lg font-semibold">{sle(wallet?.invested_amount || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className="text-lg font-semibold text-success">
                  +{sle(wallet?.total_profit || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Deposit/Withdraw Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDepositModalOpen(true)}
              className="glass-card p-4 flex items-center justify-center gap-3 hover:bg-success/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-success" />
              </div>
              <span className="font-semibold">Deposit</span>
            </button>
            <button
              onClick={() => setWithdrawModalOpen(true)}
              className="glass-card p-4 flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Minus className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold">Withdraw</span>
            </button>
          </div>

          {/* Active Investments with Animated Progress */}
          {investments.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Active Investments</h3>
                <span className="ml-auto text-sm text-muted-foreground">{investments.length} active</span>
              </div>
              <div className="space-y-4">
                {investments.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="p-4 bg-muted/50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">
                            {inv.company_ticker?.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{inv.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {sle(inv.amount)} invested • {inv.maturity_days} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{sle(inv.current_value)}</p>
                        <p className={cn(
                          "text-sm flex items-center gap-1 justify-end",
                          inv.profit_loss >= 0 ? "text-success" : "text-muted-foreground"
                        )}>
                          {inv.profit_loss >= 0 ? <TrendingUp className="w-3 h-3" /> : null}
                          {formatSLE(Math.abs(inv.profit_loss), true)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <InvestmentProgressBar
                      maturityDate={inv.maturity_date}
                      maturityDays={inv.maturity_days}
                      createdAt={inv.created_at}
                      companyName={inv.company_name || ''}
                      amount={inv.amount}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-3">Recent Transactions</h3>
            {transactions.length > 0 ? (
              <div>
                {transactions.slice(0, 5).map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    type={tx.type}
                    amount={Number(tx.amount)}
                    description={tx.description || ''}
                    date={tx.created_at}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No transactions yet</p>
            )}
          </div>
        </>
      )}

      {/* Profile View */}
      {showProfile && (
        <>
          {/* Profile Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.name || 'User'}</h2>
                <p className="text-muted-foreground text-sm">{profile?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <Wallet className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p className="font-bold">{sle(wallet?.balance || 0)}</p>
              </div>
              <div className="glass-card p-4">
                <TrendingUp className="w-5 h-5 text-success mb-2" />
                <p className="text-xs text-muted-foreground">Total Invested</p>
                <p className="font-bold">{sle(totalInvested)}</p>
              </div>
              <div className="glass-card p-4">
                <Award className="w-5 h-5 text-warning mb-2" />
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="font-bold">{winRate.toFixed(0)}%</p>
              </div>
              <div className="glass-card p-4">
                <Building2 className="w-5 h-5 text-accent mb-2" />
                <p className="text-xs text-muted-foreground">Investments</p>
                <p className="font-bold">{investments.length + completedInvestments.length}</p>
              </div>
            </div>
          </div>

          {/* Investment Stats - Only Profits */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-4">Investment Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-success/10 rounded-xl">
                <TrendingUp className="w-5 h-5 text-success mb-2" />
                <p className="text-xs text-muted-foreground">Total Profit Earned</p>
                <p className="text-xl font-bold text-success">+{sle(totalProfit)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl">
                <Award className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Successful Investments</p>
                <p className="text-xl font-bold text-primary">{successfulInvestments}</p>
              </div>
            </div>
          </div>

          {/* Completed Investments - Only show profitable ones prominently */}
          {completedInvestments.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Investment History</h3>
                <span className="text-sm font-medium text-success">
                  +{sle(totalProfit)} earned
                </span>
              </div>
              <div className="space-y-2">
                {completedInvestments.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        (inv.final_profit_loss || 0) >= 0 ? "bg-success/20" : "bg-muted"
                      )}>
                        <TrendingUp className={cn(
                          "w-4 h-4",
                          (inv.final_profit_loss || 0) >= 0 ? "text-success" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inv.matured_at ? new Date(inv.matured_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{sle(inv.amount)}</p>
                      <p className={cn(
                        "font-bold",
                        (inv.final_profit_loss || 0) >= 0 ? "text-success" : "text-muted-foreground"
                      )}>
                        {(inv.final_profit_loss || 0) >= 0 ? '+' : ''}{sle(Math.abs(inv.final_profit_loss || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promo Codes */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Promo Codes</h3>
            </div>
            {profile?.promo_codes && profile.promo_codes.length > 0 ? (
              <div className="space-y-2">
                {profile.promo_codes.map((code, i) => (
                  <div key={i} className="p-2 bg-primary/10 rounded-lg text-sm font-medium text-primary">
                    {code}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No promo codes yet. Stay tuned for special offers!</p>
            )}
          </div>

          {/* Account Info - Remove loss display */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-3">Account Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Status</span>
                <span className="text-success">Verified</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Earnings</span>
                <span className="text-success font-semibold">
                  +{sle(wallet?.total_profit || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            className="w-full glass-card p-4 flex items-center justify-center gap-3 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </>
      )}

      {/* Modals */}
      <DepositWithdrawModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        type="deposit"
        balance={wallet?.balance || 0}
      />
      <DepositWithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        type="withdraw"
        balance={wallet?.balance || 0}
      />
    </div>
  );
};
