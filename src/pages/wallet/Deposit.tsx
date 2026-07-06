import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SubPage } from '@/components/wallet/SubPage';
import { Money } from '@/components/wallet/Money';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { useWallet } from '@/hooks/useWallet';
import { usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import { cn } from '@/lib/utils';
import { Smartphone, Building2, Wallet as WalletIcon, Plus, Clock, ChevronRight, Info } from 'lucide-react';

const METHODS = [
  { id: 'mobile', name: 'Mobile Money', desc: 'Orange Money · Afrimoney', icon: Smartphone, available: true },
  { id: 'bank', name: 'Bank Transfer', desc: 'Coming soon', icon: Building2, available: false },
  { id: 'wallet', name: 'Wallet Transfer', desc: 'Receive from another wallet', icon: WalletIcon, available: false },
];

const Deposit = () => {
  const navigate = useNavigate();
  const { wallet, refetch } = useWallet();
  const { paymentTransactions } = usePaymentTransactions();
  const [open, setOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (params.get('deposit') === '1' || params.get('amount')) {
      const amt = params.get('amount');
      if (amt) setInitialAmount(amt);
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete('deposit'); next.delete('amount');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const handleSuccess = async () => {
    refetch();
    const pending = localStorage.getItem('mine_pending_leverage');
    if (!pending) return;
    const level = parseInt(pending, 10);
    if (!level) { localStorage.removeItem('mine_pending_leverage'); return; }
    const { data } = await supabase.functions.invoke('tap-earn', { body: { action: 'buy_leverage', level } });
    if (data && !data.error) {
      localStorage.removeItem('mine_pending_leverage');
      refetch();
      toast({ title: 'Leverage unlocked! ⚡', description: 'Your mining power just increased.' });
    }
  };

  const deposits = paymentTransactions.filter(t => t.type === 'deposit');
  const pending = deposits.filter(t => t.status === 'pending');

  return (
    <SubPage title="Deposit" subtitle="Add funds to your wallet">
      <div className="glass-card p-4 gradient-primary text-primary-foreground">
        <p className="text-xs opacity-80">Available Balance</p>
        <Money value={wallet?.balance || 0} className="text-2xl font-display font-bold" />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2 px-1">Payment Methods</h3>
        <div className="space-y-2">
          {METHODS.map(m => (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => setOpen(true)}
              className={cn(
                'w-full glass-card p-4 flex items-center gap-3 transition-all active:scale-[0.99]',
                m.available ? 'hover:bg-muted/40' : 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
                <m.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 mb-1"><Info className="w-4 h-4 text-primary" /><span className="font-semibold">Deposit Info</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Minimum deposit</span><span className="font-medium">10 SLE</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Maximum deposit</span><span className="font-medium">1,000,000 SLE</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Processing time</span><span className="font-medium">Instant – 5 min</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-medium text-success">Free</span></div>
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-500" /><span className="font-semibold text-sm">Pending Deposits</span></div>
          <div className="space-y-2">
            {pending.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10">
                <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                <Money value={t.amount} className="text-sm font-bold" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-2">Deposit History</h3>
        {deposits.length ? (
          <div className="space-y-2">
            {deposits.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div>
                  <p className="text-sm font-medium capitalize">{t.provider || 'Mobile Money'}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} · {t.status}</p>
                </div>
                <Money value={t.amount} className="text-sm font-bold text-success" showSign />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground py-2">No deposits yet</p>}
      </div>

      <button onClick={() => setOpen(true)} className="w-full py-4 rounded-2xl bg-success text-success-foreground font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Plus className="w-5 h-5" /> New Deposit
      </button>

      <DepositWithdrawModal
        isOpen={open}
        onClose={() => setOpen(false)}
        type="deposit"
        balance={wallet?.balance || 0}
        initialAmount={initialAmount}
        onSuccess={handleSuccess}
      />
    </SubPage>
  );
};

export default Deposit;
