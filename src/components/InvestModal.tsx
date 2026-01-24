import { useState } from 'react';
import { X, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
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
  onInvest: (amount: number) => Promise<void>;
}

export const InvestModal = ({
  isOpen,
  onClose,
  company,
  balance,
  onInvest,
}: InvestModalProps) => {
  const [amount, setAmount] = useState('');
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
      await onInvest(investAmount);
      onClose();
    } catch {
      setError('Investment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const potentialProfit = parseFloat(amount || '0') * (company.maxReturn / 100);
  const potentialLoss = parseFloat(amount || '0') * (Math.abs(company.minReturn) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up">
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
                Investment values can go up or down. You may lose some or all of your investment.
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
                Up to {company.maxReturn}%
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
                Up to {Math.abs(company.minReturn)}%
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
            {loading ? 'Processing...' : 'Confirm Investment'}
          </button>
        </div>
      </div>
    </div>
  );
};
