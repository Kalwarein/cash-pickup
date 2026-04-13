import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useProfile } from '@/hooks/useProfile';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { PaymentTransaction, usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import { TransactionItem } from '@/components/TransactionItem';
import { ClaimInvestmentCard } from '@/components/ClaimInvestmentCard';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { 
  User, Plus, Minus, Gift, TrendingUp, TrendingDown,
  Award, BellRing, Clock, Sparkles, History, ChevronRight,
  Settings, CreditCard
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription
} from '@/components/ui/drawer';

const PROVIDER_LABELS: Record<string, string> = {
  m17: 'Orange Money',
  m18: 'Afrimoney',
};

const getMetadataString = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
};

const getNestedMetadata = (metadata: Record<string, unknown> | null, key: string) => {
  const value = metadata?.[key];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getPaymentExpiry = (tx: PaymentTransaction) => {
  return getMetadataString(tx.metadata, 'expireTime')
    || getMetadataString(tx.metadata, 'expires_at')
    || getMetadataString(getNestedMetadata(tx.metadata, 'webhook_data'), 'expireTime');
};

const getPaymentBadge = (tx: PaymentTransaction) => {
  const expiresAt = getPaymentExpiry(tx);
  const isExpired = (tx.status === 'pending' || tx.status === 'expired')
    && !!expiresAt
    && new Date(expiresAt).getTime() < Date.now();

  if (tx.status === 'completed') {
    return { label: 'Completed', className: 'bg-success/20 text-success' };
  }

  if (tx.status === 'processing') {
    return { label: 'Processing', className: 'bg-primary/15 text-primary' };
  }

  if (tx.status === 'failed') {
    return { label: 'Failed', className: 'bg-destructive/15 text-destructive' };
  }

  if (tx.status === 'expired' || isExpired) {
    return { label: 'Expired', className: 'bg-warning/20 text-warning' };
  }

  return { label: 'Valid', className: 'bg-primary/15 text-primary' };
};

const WalletProfile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { wallet, transactions, loading: walletLoading, refetch: refetchWallet } = useWallet();
  const { paymentTransactions, loading: paymentsLoading, refetch: refetchPayments } = usePaymentTransactions();
  const { investments, maturedInvestments, claimedInvestments, refetch: refetchInvestments } = useInvestments();
  const { getActivePromoCodes, userPromoCodes } = usePromoCodes();
  const { profile } = useProfile();
  const { permission, requestPermission, sendNotification } = usePushNotifications();
  const activePromoCodes = getActivePromoCodes();
  const completedInvestments = claimedInvestments;

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showPromos, setShowPromos] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPaymentTransaction, setSelectedPaymentTransaction] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || walletLoading || !user) return null;

  const netProfitLoss = completedInvestments.reduce((sum, inv) => sum + (inv.final_profit_loss || 0), 0);
  const profitableInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) > 0).length;
  const lossInvestments = completedInvestments.filter(inv => (inv.final_profit_loss || 0) < 0).length;
  const winRate = completedInvestments.length > 0 ? (profitableInvestments / completedInvestments.length) * 100 : 0;

  const handleClaimed = () => { refetchInvestments(); refetchWallet(); };
  const handlePaymentRefresh = () => {
    refetchWallet();
    refetchPayments();
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return;
    }
    sendNotification('Cash Pickup 🔔', {
      body: `Hey! Your balance is ${sle(wallet?.balance || 0)}. Check the market for new opportunities!`,
      tag: 'test-notification',
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto space-y-4 animate-fade-in">
        {/* Profile Header - edge to edge */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{profile?.name || 'User'}</h1>
                <p className="text-xs text-white/60">{profile?.email}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          {/* Balance */}
          <div className="bg-black/20 backdrop-blur rounded-2xl p-4">
            <p className="text-xs text-white/60 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-white mb-3">{sle(wallet?.balance || 0)}</p>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
              <div><p className="text-[10px] text-white/50">Invested</p><p className="text-sm font-semibold text-white">{sle(wallet?.invested_amount || 0)}</p></div>
              <div><p className="text-[10px] text-white/50">Net P/L</p><p className={cn("text-sm font-semibold", netProfitLoss >= 0 ? "text-green-300" : "text-red-300")}>{netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}</p></div>
              <div><p className="text-[10px] text-white/50">Win Rate</p><p className="text-sm font-semibold text-white">{winRate.toFixed(0)}%</p></div>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4">
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
                <span className="ml-auto text-xs bg-success/20 text-success px-2 py-0.5 rounded-full font-medium">{maturedInvestments.length} ready</span>
              </div>
              <div className="space-y-3">
                {maturedInvestments.map((inv) => (
                  <ClaimInvestmentCard key={inv.id} investment={{ ...inv, company_name: inv.company_name ?? null, company_ticker: inv.company_ticker ?? null }} onClaimed={handleClaimed} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Action Buttons - Drawer style */}
          <div className="space-y-2">
            <button onClick={() => setShowTransactions(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center"><History className="w-4 h-4 text-blue-500" /></div>
                <span className="font-medium text-sm">Transaction History</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button onClick={() => setShowPromos(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center"><Gift className="w-4 h-4 text-purple-500" /></div>
                <span className="font-medium text-sm">My Promo Codes</span>
                {activePromoCodes.length > 0 && <span className="px-2 py-0.5 rounded-full bg-success/20 text-success text-[10px] font-medium">{activePromoCodes.length} active</span>}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button onClick={() => setShowPerformance(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Award className="w-4 h-4 text-emerald-500" /></div>
                <span className="font-medium text-sm">Performance Stats</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button onClick={handleTestNotification} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><BellRing className="w-4 h-4 text-amber-500" /></div>
                <span className="font-medium text-sm">Test Notifications</span>
              </div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", permission === 'granted' ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Off'}
              </span>
            </button>

            <button onClick={() => setShowSettings(true)} className="w-full glass-card p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-500/10 flex items-center justify-center"><Settings className="w-4 h-4 text-gray-500" /></div>
                <span className="font-medium text-sm">Account Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Account Info */}
          <div className="glass-card p-4">
            <h3 className="font-semibold mb-3 text-sm">Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Member Since</span><span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total Investments</span><span>{investments.length + completedInvestments.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Monime USSD</span></div>
            </div>
          </div>
        </div>

        {/* Transaction History Drawer */}
        <Drawer open={showTransactions} onOpenChange={setShowTransactions}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>Transaction History</DrawerTitle>
                <DrawerDescription>Wallet activity and Monime payment requests</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[65vh]">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">USSD Payments</h3>
                      <span className="text-xs text-muted-foreground">{paymentTransactions.length}</span>
                    </div>
                    {paymentsLoading ? (
                      <p className="text-sm text-muted-foreground py-4">Loading payment requests...</p>
                    ) : paymentTransactions.length > 0 ? (
                      <div className="space-y-2">
                        {paymentTransactions.map((tx) => {
                          const badge = getPaymentBadge(tx);
                          const provider = tx.provider ? (PROVIDER_LABELS[tx.provider] || tx.provider) : 'Monime';
                          return (
                            <button
                              key={tx.id}
                              onClick={() => setSelectedPaymentTransaction(tx)}
                              className="w-full rounded-2xl border border-border/60 bg-card/70 p-4 text-left transition-colors hover:bg-muted/40"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold capitalize">{tx.type} via {provider}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {tx.reference || tx.monime_payment_code_id || tx.monime_payout_id || 'Transaction details'}
                                  </p>
                                </div>
                                <span className={cn('rounded-full px-2 py-1 text-[10px] font-semibold', badge.className)}>
                                  {badge.label}
                                </span>
                              </div>
                              <div className="mt-3 flex items-end justify-between gap-3">
                                <div>
                                  <p className="text-lg font-bold">{sle(tx.amount)}</p>
                                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  {tx.ussd_code ? <p>{tx.ussd_code}</p> : <p>{tx.phone_number || 'No phone saved'}</p>}
                                  <p>Tap to view details</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">No Monime payment requests yet</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Wallet Transactions</h3>
                      <span className="text-xs text-muted-foreground">{transactions.length}</span>
                    </div>
                    {transactions.length > 0 ? (
                      <div className="space-y-1">
                        {transactions.map((tx) => (
                          <TransactionItem key={tx.id} type={tx.type} amount={Number(tx.amount)} description={tx.description || ''} date={tx.created_at} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4">No wallet transactions yet</p>
                    )}
                  </div>
                </div>
            </div>
          </DrawerContent>
        </Drawer>

          <Drawer open={!!selectedPaymentTransaction} onOpenChange={(open) => !open && setSelectedPaymentTransaction(null)}>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle>{selectedPaymentTransaction?.type === 'withdrawal' ? 'Withdrawal Details' : 'Deposit Details'}</DrawerTitle>
                <DrawerDescription>
                  Review payment code validity, provider info, and Monime references
                </DrawerDescription>
              </DrawerHeader>
              {selectedPaymentTransaction && (() => {
                const tx = selectedPaymentTransaction;
                const badge = getPaymentBadge(tx);
                const expiresAt = getPaymentExpiry(tx);
                const processedPaymentData = getNestedMetadata(tx.metadata, 'processedPaymentData');
                const webhookData = getNestedMetadata(tx.metadata, 'webhook_data');
                const channelData = getNestedMetadata(processedPaymentData, 'channelData');
                const provider = tx.provider ? (PROVIDER_LABELS[tx.provider] || tx.provider) : 'Monime';

                return (
                  <div className="px-4 pb-6 overflow-y-auto max-h-[65vh] space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="text-2xl font-bold">{sle(tx.amount)}</p>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', badge.className)}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {tx.type === 'deposit'
                          ? 'This request will credit the wallet after Monime confirms the payment code has been processed.'
                          : 'This request is sent to the selected mobile wallet provider and updates automatically when Monime confirms the payout.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Provider</span><span>{provider}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{tx.phone_number || 'Not provided'}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference</span><span className="text-right break-all">{tx.reference || '—'}</span></div>
                      <div className="flex justify-between gap-4"><span className="text-muted-foreground">Created</span><span>{new Date(tx.created_at).toLocaleString()}</span></div>
                      {expiresAt && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Expires</span><span>{new Date(expiresAt).toLocaleString()}</span></div>
                      )}
                      {tx.ussd_code && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">USSD Code</span><span>{tx.ussd_code}</span></div>
                      )}
                      {tx.monime_payment_code_id && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment Code ID</span><span className="text-right break-all">{tx.monime_payment_code_id}</span></div>
                      )}
                      {tx.monime_payout_id && (
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payout ID</span><span className="text-right break-all">{tx.monime_payout_id}</span></div>
                      )}
                    </div>

                    {(processedPaymentData || webhookData) && (
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-3 text-sm">
                        <p className="font-semibold">Processor Details</p>
                        {getMetadataString(processedPaymentData, 'paymentId') && (
                          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Payment ID</span><span className="text-right break-all">{getMetadataString(processedPaymentData, 'paymentId')}</span></div>
                        )}
                        {getMetadataString(processedPaymentData, 'financialTransactionReference') && (
                          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Financial Ref</span><span className="text-right break-all">{getMetadataString(processedPaymentData, 'financialTransactionReference')}</span></div>
                        )}
                        {channelData && (
                          <>
                            {getMetadataString(channelData, 'providerId') && (
                              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Channel Provider</span><span>{getMetadataString(channelData, 'providerId')}</span></div>
                            )}
                            {getMetadataString(channelData, 'reference') && (
                              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Channel Ref</span><span className="text-right break-all">{getMetadataString(channelData, 'reference')}</span></div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </DrawerContent>
          </Drawer>

        {/* Promo Codes Drawer */}
        <Drawer open={showPromos} onOpenChange={setShowPromos}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle>My Promo Codes</DrawerTitle>
              <DrawerDescription>Manage your promotional codes</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[65vh]">
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
            </div>
          </DrawerContent>
        </Drawer>

        {/* Performance Drawer */}
        <Drawer open={showPerformance} onOpenChange={setShowPerformance}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Performance Stats</DrawerTitle>
              <DrawerDescription>Your investment performance overview</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className={cn("p-4 rounded-xl", netProfitLoss >= 0 ? "bg-success/10" : "bg-destructive/10")}>
                  {netProfitLoss >= 0 ? <TrendingUp className="w-5 h-5 text-success mb-2" /> : <TrendingDown className="w-5 h-5 text-destructive mb-2" />}
                  <p className="text-xs text-muted-foreground">Net P/L</p>
                  <p className={cn("text-xl font-bold", netProfitLoss >= 0 ? "text-success" : "text-destructive")}>{netProfitLoss >= 0 ? '+' : ''}{sle(netProfitLoss)}</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-xl">
                  <Award className="w-5 h-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold text-primary">{winRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">{profitableInvestments}W / {lossInvestments}L</p>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Settings Drawer */}
        <Drawer open={showSettings} onOpenChange={setShowSettings}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Account Settings</DrawerTitle>
              <DrawerDescription>Manage your account</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-3">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-1">Email</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm font-medium mb-1">Name</p>
                <p className="text-sm text-muted-foreground">{profile?.name}</p>
              </div>
              <button onClick={signOut} className="w-full p-4 flex items-center justify-center gap-2 text-destructive bg-destructive/10 rounded-xl font-medium hover:bg-destructive/20 transition-colors">
                Sign Out
              </button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Modals */}
        <DepositWithdrawModal isOpen={depositModalOpen} onClose={() => setDepositModalOpen(false)} type="deposit" balance={wallet?.balance || 0} onSuccess={handlePaymentRefresh} />
        <DepositWithdrawModal isOpen={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} type="withdraw" balance={wallet?.balance || 0} onSuccess={handlePaymentRefresh} />
      </main>
      <BottomNav />
    </div>
  );
};

export default WalletProfile;
