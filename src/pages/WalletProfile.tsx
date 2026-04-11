import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { TransactionItem } from '@/components/TransactionItem';
import { ClaimInvestmentCard } from '@/components/ClaimInvestmentCard';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { sle, formatSLE } from '@/lib/currency';
import { 
  User, Plus, Minus, LogOut, Gift, TrendingUp, TrendingDown,
  Award, Bell, BellRing, Clock, Sparkles, History, ChevronRight,
  Shield, Settings, CreditCard
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';

const WalletProfile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { wallet, transactions, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { investments, maturedInvestments, claimedInvestments, refetch: refetchInvestments } = useInvestments();
  const { getActivePromoCodes, userPromoCodes } = usePromoCodes();
  const { profile } = useProfile();
  const { permission, supported, requestPermission, sendNotification } = usePushNotifications();
  const activePromoCodes = getActivePromoCodes();
  const completedInvestments = claimedInvestments;

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showPromos, setShowPromos] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || walletLoading || !user) return null;

  const netProfitLoss = completedInvestments.reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);
  const profitableInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) > 0).length;
  const lossInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) < 0).length;
  const winRate = completedInvestments.length > 0 ? (profitableInvestments / completedInvestments.length) * 100 : 0;

  const handleClaimed = () => { refetchInvestments(); refetchWallet(); };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return;
    }
    sendNotification('Test Notification 🔔', {
      body: `Hey! Your balance is ${sle(wallet?.balance || 0)}. The market is looking interesting today!`,
      tag: 'test-notification',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5 animate-fade-in">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.name || 'User'}</h1>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Balance Card */}
        <div className="glass-card p-5 glow-primary">
          <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
          <p className="text-3xl font-bold mb-3">{sle(wallet?.balance || 0)}</p>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
            <div>
              <p className="text-[10px] text-muted-foreground">Invested</p>
              <p className="text-sm font-semibold">{sle(wallet?.invested_amount || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net P/L</p>
              <p className={cn("text-sm font-semibold", netProfitLoss >= 0 ? "text-success" : "text-destructive")}>
                {netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
              <p className="text-sm font-semibold text-primary">{winRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>

        {/* Deposit/Withdraw */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setDepositModalOpen(true)} className="glass-card p-3 flex items-center justify-center gap-2 hover:bg-success/10 transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 text-success" />
            </div>
            <span className="font-semibold text-sm">Deposit</span>
          </button>
          <button onClick={() => setWithdrawModalOpen(true)} className="glass-card p-3 flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Minus className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Withdraw</span>
          </button>
        </div>

        {/* Matured - Claim Section */}
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

        {/* Quick Action Buttons */}
        <div className="space-y-2">
          <button onClick={() => setShowTransactions(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <History className="w-4 h-4 text-blue-500" />
              </div>
              <span className="font-medium text-sm">Transaction History</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowPromos(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Gift className="w-4 h-4 text-purple-500" />
              </div>
              <span className="font-medium text-sm">My Promo Codes</span>
              {activePromoCodes.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-medium">{activePromoCodes.length} active</span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button onClick={() => setShowPerformance(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="font-medium text-sm">Performance Stats</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button onClick={handleTestNotification} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BellRing className="w-4 h-4 text-amber-500" />
              </div>
              <span className="font-medium text-sm">Test Notifications</span>
            </div>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              permission === 'granted' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
            )}>
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Off'}
            </span>
          </button>
        </div>

        {/* Account Info */}
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-3 text-sm">Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Investments</span><span>{investments.length + completedInvestments.length}</span></div>
          </div>
        </div>

        <button onClick={signOut} className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* Transaction History Modal */}
        <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Transaction History</DialogTitle>
              <DialogDescription>All your wallet transactions</DialogDescription>
            </DialogHeader>
            {transactions.length > 0 ? (
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} type={tx.type} amount={Number(tx.amount)} description={tx.description || ''} date={tx.created_at} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Promo Codes Modal */}
        <Dialog open={showPromos} onOpenChange={setShowPromos}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>My Promo Codes</DialogTitle>
              <DialogDescription>Manage your promotional codes</DialogDescription>
            </DialogHeader>
            {userPromoCodes.length > 0 ? (
              <div className="space-y-3">
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
              <p className="text-center text-muted-foreground py-8">No promo codes yet</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Performance Modal */}
        <Dialog open={showPerformance} onOpenChange={setShowPerformance}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Performance Stats</DialogTitle>
              <DialogDescription>Your investment performance overview</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className={cn("p-4 rounded-xl", netProfitLoss >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                {netProfitLoss >= 0 ? <TrendingUp className="w-5 h-5 text-success mb-2" /> : <TrendingDown className="w-5 h-5 text-destructive mb-2" />}
                <p className="text-xs text-muted-foreground">Net P/L</p>
                <p className={cn("text-xl font-bold", netProfitLoss >= 0 ? "text-success" : "text-destructive")}>
                  {netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}
                </p>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl">
                <Award className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold text-primary">{winRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">{profitableInvestments}W / {lossInvestments}L</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <DepositWithdrawModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} type="deposit" balance={wallet?.balance || 0} />
        <DepositWithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} type="withdraw" balance={wallet?.balance || 0} />
      </main>
      <BottomNav />
    </div>
  );
};

export default WalletProfile;