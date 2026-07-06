import { useState } from 'react';
import { SubPage } from '@/components/wallet/SubPage';
import { Money } from '@/components/wallet/Money';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, User, Hash, CreditCard, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

type Mode = 'wallet_id' | 'account_number';

const Transfer = () => {
  const { wallet } = useWallet();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('wallet_id');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [error, setError] = useState('');

  const balance = wallet?.balance || 0;
  const value = parseFloat(amount) || 0;
  const myWalletId = `CP-${(user?.id || '').slice(0, 8).toUpperCase()}`;

  const proceed = () => {
    if (!recipient.trim()) return setError('Enter a recipient');
    if (recipient.trim().toUpperCase() === myWalletId) return setError('You cannot transfer to yourself');
    if (value < 10) return setError('Minimum transfer is 10 SLE');
    if (value > balance) return setError('Insufficient balance');
    setError('');
    setStep('confirm');
  };

  const confirm = () => {
    setStep('done');
    toast({ title: 'Transfer queued', description: `${value.toLocaleString()} SLE to ${recipient} is being processed.` });
  };

  return (
    <SubPage title="Transfer" subtitle="Send funds to another wallet">
      <div className="glass-card p-4 gradient-primary text-primary-foreground">
        <p className="text-xs opacity-80">Available Balance</p>
        <Money value={balance} className="text-2xl font-display font-bold" />
        <p className="text-[11px] opacity-70 mt-2">Your Wallet ID: <span className="font-mono font-semibold">{myWalletId}</span></p>
      </div>

      {step === 'form' && (
        <>
          <div className="glass-card p-1.5 grid grid-cols-2 gap-1.5">
            {(['wallet_id', 'account_number'] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} className={cn('py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2', mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {m === 'wallet_id' ? <Hash className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {m === 'wallet_id' ? 'Wallet ID' : 'Account No.'}
              </button>
            ))}
          </div>

          <div className="glass-card p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{mode === 'wallet_id' ? 'Recipient Wallet ID' : 'Recipient Account Number'}</label>
              <input
                value={recipient}
                onChange={e => { setRecipient(e.target.value); setError(''); }}
                placeholder={mode === 'wallet_id' ? 'CP-XXXXXXXX' : '0000 0000 00'}
                className="w-full bg-input border border-border rounded-2xl px-4 py-3.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">SLE</span>
                <input
                  type="number" value={amount}
                  onChange={e => { setAmount(e.target.value); setError(''); }}
                  placeholder="0.00"
                  className="w-full bg-input border border-border rounded-2xl pl-14 pr-4 py-3.5 text-xl font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {error && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}
          </div>

          <button onClick={proceed} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <ArrowLeftRight className="w-5 h-5" /> Continue
          </button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <div className="glass-card p-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center mb-3">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="font-semibold text-lg">Confirm Recipient</p>
            <p className="text-sm text-muted-foreground">Verify the details before sending</p>
            <div className="mt-4 space-y-2 text-sm text-left">
              <div className="flex justify-between p-3 rounded-xl bg-muted/40"><span className="text-muted-foreground">{mode === 'wallet_id' ? 'Wallet ID' : 'Account Number'}</span><span className="font-mono font-semibold">{recipient}</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-muted/40"><span className="text-muted-foreground">Amount</span><Money value={value} className="font-bold" /></div>
              <div className="flex justify-between p-3 rounded-xl bg-muted/40"><span className="text-muted-foreground">Fee</span><span className="font-medium text-success">Free</span></div>
              <div className="flex justify-between p-3 rounded-xl bg-muted/40"><span className="text-muted-foreground">Remaining balance</span><Money value={balance - value} className="font-bold" /></div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground justify-center"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Transfers are irreversible once confirmed</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep('form')} className="py-4 rounded-2xl bg-muted font-semibold active:scale-[0.98] transition-transform">Back</button>
            <button onClick={confirm} className="py-4 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.98] transition-transform">Confirm & Send</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div className="glass-card p-8 text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <p className="font-display font-bold text-xl mb-1">Transfer Submitted</p>
          <p className="text-sm text-muted-foreground mb-1"><Money value={value} /> to</p>
          <p className="font-mono font-semibold mb-6">{recipient}</p>
          <button onClick={() => { setStep('form'); setRecipient(''); setAmount(''); }} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold active:scale-[0.98] transition-transform">Done</button>
        </div>
      )}
    </SubPage>
  );
};

export default Transfer;
