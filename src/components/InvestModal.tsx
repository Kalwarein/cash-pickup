import { useState } from 'react';
import { X, AlertTriangle, Clock, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { RiskWarning } from '@/components/RiskWarning';

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: {
    id: string;
    name: string;
    ticker: string;
    minInvestment: number;
    riskLevel: 'Low' | 'Medium' | 'High';
    cprToday: number;
  };
  balance: number;
  onInvest: (amount: number, maturityDays: number) => Promise<void>;
}

// Investment duration options
const MATURITY_OPTIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
  { days: 90, label: '3 Months' },
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

  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + selectedMaturity.days);

  // Show potential scenarios
  const investAmount = parseFloat(amount || '0');
  const bestCase = investAmount * 1.5; // +50% max
  const worstCase = investAmount * 0.1; // -90% loss, minimum 10% remains

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
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">{company.ticker}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                company.riskLevel === 'Low' && "bg-success/20 text-success",
                company.riskLevel === 'Medium' && "bg-warning/20 text-warning",
                company.riskLevel === 'High' && "bg-destructive/20 text-destructive"
              )}>
                {company.riskLevel} Risk
              </span>
            </div>
          </div>

          {/* Current CPR */}
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Today's Performance Rate</p>
            <div className="flex items-center gap-2">
              {company.cprToday >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
              <p className={cn(
                "text-2xl font-bold",
                company.cprToday >= 0 ? "text-success" : "text-destructive"
              )}>
                {company.cprToday >= 0 ? '+' : ''}{company.cprToday.toFixed(1)}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Note: Final outcome depends on CPR on maturity date
            </p>
          </div>

          {/* Risk Warning Banner */}
          <RiskWarning variant="default" />

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

          {/* Potential Outcomes */}
          {investAmount > 0 && (
            <div className="glass-card p-4 bg-muted/50">
              <p className="text-sm font-medium mb-3">Potential Outcomes at Maturity</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-muted-foreground">Best Case (+50%)</p>
                  <p className="font-bold text-success">{sle(bestCase)}</p>
                  <p className="text-xs text-success">+{sle(bestCase - investAmount)}</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-muted-foreground">Worst Case (-90%)</p>
                  <p className="font-bold text-destructive">{sle(worstCase)}</p>
                  <p className="text-xs text-destructive">-{sle(investAmount - worstCase)}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Most outcomes fall between these extremes based on CPR on maturity day
              </p>
            </div>
          )}

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

          <p className="text-xs text-center text-muted-foreground">
            By investing, you acknowledge that you understand the risks involved.
          </p>
        </div>
      </div>
    </div>
  );
};
