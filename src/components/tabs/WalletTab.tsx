import { useEffect } from 'react';
import { User, RefreshCw, Wallet, TrendingUp, TrendingDown, Award, LogOut, ArrowUpDown, Gift, Target, XCircle, Timer } from 'lucide-react';
import { TransactionItem } from '@/components/TransactionItem';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useForexTrades } from '@/hooks/useForexTrades';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const WalletTab = () => {
  const { wallet, transactions, loading, deposit, refetch: refetchWallet } = useWallet();
  const { investments, completedInvestments } = useInvestments();
  const { profile, updateViewPreference } = useProfile();
  const { signOut } = useAuth();
  const { openTrades, closeTrade, checkAndCloseTrades, calculateUnrealizedPL } = useForexTrades();
  const { currentPrice } = useMarketCandles();

  // Use database-persisted view preference
  const showProfile = profile?.wallet_view_preference === 'profile';

  // Check for auto-close conditions
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice > 0) {
        checkAndCloseTrades(currentPrice);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentPrice, checkAndCloseTrades]);

  const handleToggleView = () => {
    const newView = showProfile ? 'wallet' : 'profile';
    updateViewPreference(newView);
  };

  const handleCloseTrade = async (tradeId: string) => {
    const { error, profitLoss } = await closeTrade(tradeId, currentPrice);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Trade closed: ${profitLoss && profitLoss >= 0 ? '+' : ''}$${profitLoss?.toFixed(2)}`);
      await refetchWallet();
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expiring...';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);
  const completedPL = completedInvestments.reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);
  const allInvestments = [...investments, ...completedInvestments];
  const winRate = allInvestments.filter(inv => inv.is_matured).length > 0
    ? (allInvestments.filter(inv => inv.is_matured && (inv.final_profit_loss || 0) > 0).length / 
       allInvestments.filter(inv => inv.is_matured).length) * 100
    : 0;

  const unrealizedPL = calculateUnrealizedPL(currentPrice);

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
                <p className="text-4xl font-bold">${wallet?.balance.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-lg font-semibold">${wallet?.invested_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Profit</p>
                <p className={cn(
                  "text-lg font-semibold",
                  (wallet?.total_profit || 0) >= (wallet?.total_loss || 0) ? "text-success" : "text-destructive"
                )}>
                  +${wallet?.total_profit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Open Trades */}
          {openTrades.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Open Trades</h3>
                <span className={cn(
                  "text-sm font-medium",
                  unrealizedPL >= 0 ? "text-success" : "text-destructive"
                )}>
                  P/L: {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-3">
                {openTrades.map((trade) => {
                  const priceChange = (currentPrice - trade.entry_price) / trade.entry_price;
                  const currentPL = trade.amount * priceChange;
                  
                  return (
                    <div key={trade.id} className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            currentPL >= 0 ? "bg-success/20" : "bg-destructive/20"
                          )}>
                            {currentPL >= 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">${trade.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Entry: ${trade.entry_price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "font-bold",
                            currentPL >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {currentPL >= 0 ? '+' : ''}${currentPL.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Timer className="w-3 h-3" />
                            {getTimeRemaining(trade.expires_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="flex items-center gap-1 text-success">
                          <Target className="w-3 h-3" />
                          TP: ${trade.take_profit.toFixed(2)}
                        </span>
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="w-3 h-3" />
                          SL: ${trade.stop_loss.toFixed(2)}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleCloseTrade(trade.id)}
                        className="w-full py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Close Trade
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Investments */}
          {investments.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-3">Active Investments</h3>
              <div className="space-y-3">
                {investments.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {inv.company_ticker?.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{inv.company_name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${inv.amount.toFixed(2)} invested
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${inv.current_value.toFixed(2)}</p>
                      <p className={cn(
                        "text-sm flex items-center gap-1 justify-end",
                        inv.profit_loss >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {inv.profit_loss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {inv.profit_loss >= 0 ? '+' : ''}${inv.profit_loss.toFixed(2)}
                      </p>
                    </div>
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
                <p className="font-bold">${wallet?.balance.toFixed(2)}</p>
              </div>
              <div className="glass-card p-4">
                <TrendingUp className="w-5 h-5 text-success mb-2" />
                <p className="text-xs text-muted-foreground">Investments</p>
                <p className="font-bold">{investments.length + completedInvestments.length}</p>
              </div>
              <div className="glass-card p-4">
                <Award className="w-5 h-5 text-warning mb-2" />
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="font-bold">{winRate.toFixed(0)}%</p>
              </div>
              <div className="glass-card p-4">
                <RefreshCw className="w-5 h-5 text-accent mb-2" />
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-bold text-success">Active</p>
              </div>
            </div>
          </div>

          {/* Promo Codes (Future) */}
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

          {/* Account Info */}
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
                <span className="text-muted-foreground">Total Profit</span>
                <span className="text-success">
                  +${wallet?.total_profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Loss</span>
                <span className="text-destructive">
                  -${wallet?.total_loss.toFixed(2)}
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
    </div>
  );
};
