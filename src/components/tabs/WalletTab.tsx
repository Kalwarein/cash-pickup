import { useState } from 'react';
import { User, RefreshCw, Wallet, TrendingUp, TrendingDown, Award, LogOut, ArrowUpDown } from 'lucide-react';
import { TransactionItem } from '@/components/TransactionItem';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

export const WalletTab = () => {
  const { wallet, transactions, loading, deposit } = useWallet();
  const { investments } = useInvestments();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);

  const totalProfitLoss = investments.reduce((sum, inv) => sum + inv.profit_loss, 0);
  const winRate = investments.length > 0
    ? (investments.filter(inv => inv.profit_loss > 0).length / investments.length) * 100
    : 0;

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (amount > 0) {
      await deposit(amount);
      setDepositAmount('');
      setShowDeposit(false);
    }
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
    <div className="space-y-6 animate-fade-in">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {showProfile ? 'Profile' : 'Wallet'}
        </h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setShowProfile(!showProfile)}
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
              <button
                onClick={() => setShowDeposit(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Deposit
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground">Invested</p>
                <p className="text-lg font-semibold">${wallet?.invested_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit/Loss</p>
                <p className={cn(
                  "text-lg font-semibold",
                  totalProfitLoss >= 0 ? "text-success" : "text-destructive"
                )}>
                  {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

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
                <p className="font-bold">{investments.length}</p>
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
                <span className="text-muted-foreground">Total P/L</span>
                <span className={totalProfitLoss >= 0 ? "text-success" : "text-destructive"}>
                  {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
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

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up">
            <h2 className="text-xl font-bold mb-4">Deposit Funds</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Add funds to your wallet to start investing
            </p>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-input border border-border rounded-xl px-4 py-3 mb-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeposit(false)}
                className="flex-1 py-3 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
