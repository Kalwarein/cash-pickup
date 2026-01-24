import { useState } from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    id: string;
    name: string;
    ticker: string;
    price: number;
    riskLevel: string;
    minReturn: number;
    maxReturn: number;
  };
  balance: number;
  onInvest: (amount: number, maturityDays: number) => Promise<void>;
}

const MATURITY_OPTIONS = [
  { days: 6, label: '6 Days', risk: 'High', returnMultiplier: 0.6 },
  { days: 10, label: '10 Days', risk: 'Medium-High', returnMultiplier: 0.75 },
  { days: 14, label: '14 Days', risk: 'Medium', returnMultiplier: 0.9 },
  { days: 21, label: '21 Days', risk: 'Medium-Low', returnMultiplier: 1.0 },
  { days: 30, label: '30 Days', risk: 'Low', returnMultiplier: 1.15 },
  { days: 60, label: '60 Days', risk: 'Very Low', returnMultiplier: 1.35 },
];

export const InvestModal = ({
  isOpen,
  onClose,
  company,
  balance,
  onInvest,
}: InvestModalProps) => {
  const [amount, setAmount] = useState('');
  const [selectedMaturity, setSelectedMaturity] = useState(MATURITY_OPTIONS[2]); // Default 14 days
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

    if (investAmount < 10) {
      setError('Minimum investment is $10');
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

  const adjustedMaxReturn = company.maxReturn * selectedMaturity.returnMultiplier;
  const adjustedMinReturn = company.minReturn * (2 - selectedMaturity.returnMultiplier);
  const potentialProfit = parseFloat(amount || '0') * (adjustedMaxReturn / 100);
  const potentialLoss = parseFloat(amount || '0') * (Math.abs(adjustedMinReturn) / 100);

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
            <p className="text-sm text-muted-foreground mb-1">{company.name}</p>
            <p className="text-2xl font-bold">${company.price.toFixed(2)}</p>
          </div>

          <div className="glass-card p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Risk Level: {company.riskLevel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Investment values can go up or down. Returns depend on market conditions and maturity period.
              </p>
            </div>
          </div>

          {/* Maturity Period Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Investment Period (Maturity)
            </label>
            <div className="grid grid-cols-3 gap-2">
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
                    {option.risk}
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
              <p className="text-xs text-muted-foreground mt-2">
                {selectedMaturity.days < 14 
                  ? "⚠️ Shorter periods have higher risk but faster returns"
                  : selectedMaturity.days >= 30
                  ? "✅ Longer periods are safer with better potential returns"
                  : "📊 Balanced risk and return potential"
                }
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Investment Amount (Balance: ${balance.toFixed(2)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount..."
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Potential Gain</span>
              </div>
              <p className="font-bold text-green-400">
                +${potentialProfit.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {adjustedMaxReturn.toFixed(0)}%
              </p>
            </div>
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Potential Loss</span>
              </div>
              <p className="font-bold text-red-400">
                -${potentialLoss.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {Math.abs(adjustedMinReturn).toFixed(0)}%
              </p>
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
