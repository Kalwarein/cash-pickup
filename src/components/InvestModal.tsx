import { useState } from 'react';
import { X, AlertTriangle, TrendingUp, Clock, Calendar, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    id: string;
    name: string;
    ticker: string;
    minInvestment: number;
    guaranteedReturnPercent: number;
  };
  balance: number;
  onInvest: (amount: number, maturityDays: number) => Promise<void>;
}

// Investment duration options (max 3 months)
const MATURITY_OPTIONS = [
  { days: 7, label: '1 Week', returnMultiplier: 0.7 },
  { days: 14, label: '2 Weeks', returnMultiplier: 0.85 },
  { days: 30, label: '1 Month', returnMultiplier: 1.0 },
  { days: 90, label: '3 Months', returnMultiplier: 1.5 },
];

export const InvestModal = ({
  isOpen,
  onClose,
  company,
  balance,
  onInvest,
}: InvestModalProps) => {
  const [amount, setAmount] = useState('');
  const [selectedMaturity, setSelectedMaturity] = useState(MATURITY_OPTIONS[2]); // Default 1 month
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const investAmount = parseFloat(amount);
    
    if (!investAmount || investAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (investAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (investAmount < company.minInvestment) {
      setError(`Minimum investment is ${sle(company.minInvestment)}`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onInvest(investAmount, selectedMaturity.days);
      onClose();
    } catch {
      setError('Investment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate guaranteed return based on duration
  const adjustedReturnPercent = company.guaranteedReturnPercent * selectedMaturity.returnMultiplier;
  const guaranteedProfit = parseFloat(amount || '0') * (adjustedReturnPercent / 100);
  const totalReturn = parseFloat(amount || '0') + guaranteedProfit;

  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + selectedMaturity.days);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Invest in {company.ticker}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Investing in</p>
            <p className="text-2xl font-bold">{company.name}</p>
            <p className="text-sm text-muted-foreground">{company.ticker}</p>
          </div>

          {/* Guaranteed Return Banner */}
          <div className="glass-card p-4 flex items-start gap-3 bg-success/10 border-success/20">
            <Shield className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-success">Guaranteed Returns</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your investment return is guaranteed. No risk of loss on company investments.
              </p>
            </div>
          </div>

          {/* Investment Period Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Investment Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MATURITY_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setSelectedMaturity(option)}
                  className={cn(
                    "p-3 rounded-xl text-center transition-all border",
                    selectedMaturity.days === option.days
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:border-primary/50"
                  )}
                >
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className={cn(
                    "text-xs mt-1",
                    selectedMaturity.days === option.days
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}>
                    {(company.guaranteedReturnPercent * option.returnMultiplier).toFixed(0)}% return
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Matures on:</span>
                <span className="font-semibold text-primary">
                  {maturityDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Investment Amount (Balance: {sle(balance)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min: ${sle(company.minInvestment)}`}
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          {/* Guaranteed Return Preview */}
          <div className="glass-card p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-2 text-success mb-3">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">Guaranteed Return</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">You Invest</p>
                <p className="font-bold">{sle(parseFloat(amount || '0'))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">You Receive</p>
                <p className="font-bold text-success">{sle(totalReturn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="font-bold text-success">+{sle(guaranteedProfit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Return Rate</p>
                <p className="font-bold text-success">+{adjustedReturnPercent.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              "w-full py-4 rounded-xl font-semibold text-lg transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:scale-[0.98]",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Processing...' : `Invest for ${selectedMaturity.label}`}
          </button>
        </div>
      </div>
    </div>
  );
};
