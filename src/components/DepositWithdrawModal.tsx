import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Wallet, AlertCircle, Phone, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
  balance: number;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];
const PROVIDERS = [
  { id: 'm17', name: 'Orange Money', color: '#FF6600' },
  { id: 'm18', name: 'Afrimoney', color: '#00A0E3' },
];

export const DepositWithdrawModal = ({
  isOpen,
  onClose,
  type,
  balance,
  onSuccess,
}: DepositWithdrawModalProps) => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('m17');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ussdCode, setUssdCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [step, setStep] = useState<'form' | 'ussd'>('form');

  if (!isOpen) return null;

  const isDeposit = type === 'deposit';
  const amountValue = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!amountValue || amountValue <= 0) { setError('Please enter a valid amount'); return; }
    if (!isDeposit && amountValue > balance) { setError('Insufficient balance'); return; }
    if (amountValue < 10) { setError('Minimum amount is 10 SLE'); return; }
    if (!isDeposit && !phoneNumber) { setError('Phone number is required'); return; }

    setLoading(true);
    setError('');

    try {
      const endpoint = isDeposit ? 'monime-deposit' : 'monime-withdraw';
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ amount: amountValue, phoneNumber, provider }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      if (isDeposit && result.ussd_code) {
        setUssdCode(result.ussd_code);
        setExpiresAt(result.expires_at || '');
        setResponseMessage(result.message || '');
        setStep('ussd');
        setLoading(false);
        onSuccess?.();
      } else {
        toast.success(result.message || `${isDeposit ? 'Deposit' : 'Withdrawal'} request submitted!`);
        setLoading(false);
        onSuccess?.();
        onClose();
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setUssdCode('');
    setExpiresAt('');
    setResponseMessage('');
    setAmount('');
    setPhoneNumber('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isDeposit ? "bg-success/20" : "bg-primary/20")}>
              {isDeposit ? <ArrowDownLeft className="w-6 h-6 text-success" /> : <ArrowUpRight className="w-6 h-6 text-primary" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">{isDeposit ? 'Deposit via USSD' : 'Withdraw to Mobile Money'}</h2>
              <p className="text-sm text-muted-foreground">{isDeposit ? 'Pay with Orange Money or Afrimoney' : 'Transfer to your mobile wallet'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'ussd' ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-10 h-10 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Dial this code to complete your deposit</p>
              <p className="text-3xl font-bold text-primary tracking-wider">{ussdCode}</p>
            </div>
            <div className="space-y-2">
              {responseMessage && <p className="text-sm text-foreground">{responseMessage}</p>}
              <p className="text-xs text-muted-foreground">
                {expiresAt
                  ? `This payment code stays valid until ${new Date(expiresAt).toLocaleString()}.`
                  : 'This payment code stays valid for a limited time.'}
              </p>
              <p className="text-xs text-muted-foreground">Your wallet will be credited automatically after payment confirmation.</p>
            </div>
            <button onClick={handleClose} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg">Done</button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Balance */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Available Balance</span>
              </div>
              <span className="font-bold text-lg">{sle(balance)}</span>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Payment Provider</label>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      "p-3 rounded-2xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      provider === p.id ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Phone Number</label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => { setPhoneNumber(e.target.value); setError(''); }}
                  placeholder="+232 XX XXX XXXX"
                  className="w-full bg-input border border-border rounded-2xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{isDeposit ? 'Deposit Amount' : 'Withdrawal Amount'}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">SLE</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(''); }}
                  placeholder="0.00"
                  className="w-full bg-input border border-border rounded-2xl pl-14 pr-4 py-4 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-5 gap-2">
              {QUICK_AMOUNTS.map(v => (
                <button
                  key={v}
                  onClick={() => { setAmount(v.toString()); setError(''); }}
                  disabled={!isDeposit && v > balance}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-medium transition-all",
                    amount === v.toString() ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                    !isDeposit && v > balance && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary */}
            {amountValue > 0 && (
              <div className="p-4 bg-muted/50 rounded-2xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{sle(amountValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee</span>
                  <span className="font-medium text-success">Free</span>
                </div>
                <div className="pt-2 border-t border-border/50 flex justify-between">
                  <span className="font-medium">{isDeposit ? 'New Balance' : 'Remaining'}</span>
                  <span className="font-bold">{sle(isDeposit ? balance + amountValue : balance - amountValue)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || amountValue <= 0}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold text-lg transition-all",
                isDeposit ? "bg-success text-success-foreground hover:bg-success/90" : "bg-primary text-primary-foreground hover:bg-primary/90",
                (loading || amountValue <= 0) && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isDeposit ? `Deposit ${amountValue > 0 ? sle(amountValue) : ''}` : `Withdraw ${amountValue > 0 ? sle(amountValue) : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
