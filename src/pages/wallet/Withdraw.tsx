import { useState } from 'react';
import { SubPage } from '@/components/wallet/SubPage';
import { Money } from '@/components/wallet/Money';
import { DepositWithdrawModal } from '@/components/DepositWithdrawModal';
import { useWallet } from '@/hooks/useWallet';
import { usePaymentTransactions } from '@/hooks/usePaymentTransactions';
import { cn } from '@/lib/utils';
import { Smartphone, Building2, Wallet as WalletIcon, Minus, Clock, ChevronRight, Info } from 'lucide-react';

const METHODS = [
  { id: 'mobile', name: 'Mobile Money', desc: 'Orange Money · Afrimoney', icon: Smartphone, available: true },
  { id: 'bank', name: 'Bank Account', desc: 'Coming soon', icon: Building2, available: false },
  { id: 'wallet', name: 'Another Wallet', desc: 'Use Transfer instead', icon: WalletIcon, available: false },
];

const Withdraw = () => {
  const { wallet, refetch } = useWallet();
  const { paymentTransactions } = usePaymentTransactions();
  const [open, setOpen] = useState(false);

  const withdrawals = paymentTransactions.filter(t => t.type === 'withdrawal');
  const pending = withdrawals.filter(t => t.status === 'pending');

  return (
    <SubPage title="Withdraw" subtitle="Cash out to mobile money">
      <div className="glass-card p-4 gradient-primary text-primary-foreground">
        <p className="text-xs opacity-80">Available Balance</p>
        <Money value={wallet?.balance || 0} className="text-2xl font-display font-bold" />
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2 px-1">Withdraw To</h3>
        <div className="space-y-2">
          {METHODS.map(m => (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => setOpen(true)}
              className={cn('w-full glass-card p-4 flex items-center gap-3 transition-all active:scale-[0.99]', m.available ? 'hover:bg-muted/40' : 'opacity-50 cursor-not-allowed')}
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
        <div className="flex items-center gap-2 mb-1"><Info className="w-4 h-4 text-primary" /><span className="font-semibold">Withdrawal Info</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Minimum</span><span className="font-medium">10 SLE</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Daily limit</span><span className="font-medium">500,000 SLE</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Processing time</span><span className="font-medium">Instant – 15 min</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span className="font-medium text-success">Free</span></div>
      </div>

      {pending.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-500" /><span className="font-semibold text-sm">Pending Withdrawals</span></div>
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
        <h3 className="font-semibold text-sm mb-2">Recent Withdrawals</h3>
        {withdrawals.length ? (
          <div className="space-y-2">
            {withdrawals.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40">
                <div>
                  <p className="text-sm font-medium">{t.phone_number || t.provider || 'Mobile Money'}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} · {t.status}</p>
                </div>
                <Money value={-t.amount} className="text-sm font-bold text-destructive" showSign />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground py-2">No withdrawals yet</p>}
      </div>

      <button onClick={() => setOpen(true)} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
        <Minus className="w-5 h-5" /> New Withdrawal
      </button>

      <DepositWithdrawModal isOpen={open} onClose={() => setOpen(false)} type="withdraw" balance={wallet?.balance || 0} onSuccess={refetch} />
    </SubPage>
  );
};

export default Withdraw;
