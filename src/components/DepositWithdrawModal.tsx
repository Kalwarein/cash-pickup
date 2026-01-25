import { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, Wallet, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { toast } from 'sonner';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdraw';
  balance: number;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

export const DepositWithdrawModal = ({
  isOpen,
  onClose,
  type,
  balance,
}: DepositWithdrawModalProps) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isDeposit = type === 'deposit';
  const amountValue = parseFloat(amount) || 0;

  const handleSubmit = async () => {
    if (!amountValue || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!isDeposit && amountValue > balance) {
      setError('Insufficient balance');
      return;
    }

    if (amountValue < 10) {
      setError('Minimum amount is 10 SLE');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    setLoading(false);
    
    // Show coming soon message
    toast.info(
      isDeposit 
        ? 'Deposit system coming soon! Monime integration in progress.' 
        : 'Withdrawal system coming soon! Monime integration in progress.',
      {
        duration: 4000,
        icon: <Sparkles className="w-5 h-5 text-primary" />,
      }
    );
    
    onClose();
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isDeposit ? "bg-success/20" : "bg-primary/20"
            )}>
              {isDeposit ? (
                <ArrowDownLeft className="w-6 h-6 text-success" />
              ) : (
                <ArrowUpRight className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isDeposit ? 'Deposit Funds' : 'Withdraw Funds'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDeposit ? 'Add money to your wallet' : 'Transfer to your bank'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Balance */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <span className="font-bold text-lg">{sle(balance)}</span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {isDeposit ? 'Deposit Amount' : 'Withdrawal Amount'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                SLE
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="0.00"
                className="w-full bg-input border border-border rounded-xl pl-14 pr-4 py-4 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-right"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Quick Select</label>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  onClick={() => handleQuickAmount(value)}
                  disabled={!isDeposit && value > balance}
                  className={cn(
                    "py-2 rounded-xl text-sm font-medium transition-all",
                    amount === value.toString()
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80",
                    !isDeposit && value > balance && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {value >= 1000 ? `${value / 1000}k` : value}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {amountValue > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{sle(amountValue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="font-medium text-success">Free</span>
              </div>
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="font-medium">
                  {isDeposit ? 'New Balance' : 'Remaining Balance'}
                </span>
                <span className="font-bold text-lg">
                  {sle(isDeposit ? balance + amountValue : balance - amountValue)}
                </span>
              </div>
            </div>
          )}

          {/* Coming Soon Notice */}
          <div className="glass-card p-4 bg-warning/10 border-warning/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Coming Soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Real {isDeposit ? 'deposits' : 'withdrawals'} will be available soon via Monime payment integration. 
                  Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading || amountValue <= 0}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-lg transition-all",
              isDeposit
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
              (loading || amountValue <= 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              isDeposit ? 'Deposit' : 'Withdraw'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
