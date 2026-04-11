import { useState, useMemo } from 'react';
import { X, AlertTriangle, Clock, Calendar, TrendingUp, TrendingDown, Info } from 'lucide-react';
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

const MATURITY_OPTIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
  { days: 90, label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year' },
];

// Investment limits per duration based on risk
function getMaxInvestment(riskLevel: string, days: number): number {
  const base = riskLevel === 'Low' ? 500000 : riskLevel === 'Medium' ? 200000 : 100000;
  if (days <= 7) return base;
  if (days <= 14) return base * 0.8;
  if (days <= 30) return base * 0.6;
  if (days <= 90) return base * 0.4;
  if (days <= 180) return base * 0.25;
  return base * 0.15; // 1 year
}

function getProjections(amount: number, days: number, riskLevel: string) {
  // Time multiplier - longer = more potential swing
  const timeFactor = Math.min(2, 1 + days / 365);
  
  // Risk factor adjustments
  const riskMult = riskLevel === 'Low' ? 0.6 : riskLevel === 'Medium' ? 1 : 1.4;
  
  const bestPercent = Math.min(50, 10 + days * 0.15 * (2 - riskMult * 0.5));
  const worstPercent = Math.max(-90, -(5 + days * 0.1 * riskMult));
  
  const bestCase = amount * (1 + bestPercent / 100);
  const worstCase = Math.max(amount * 0.05, amount * (1 + worstPercent / 100));
  
  return { bestCase, worstCase, bestPercent, worstPercent };
}

export const InvestModal = ({
  isOpen, onClose, company, balance, onInvest,
}: InvestModalProps) => {
  const [amount, setAmount] = useState('');
  const [selectedMaturity, setSelectedMaturity] = useState(MATURITY_OPTIONS[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const investAmount = parseFloat(amount || '0');
  const maxInvestment = getMaxInvestment(company.riskLevel, selectedMaturity.days);
  const projections = useMemo(
    () => getProjections(investAmount, selectedMaturity.days, company.riskLevel),
    [investAmount, selectedMaturity.days, company.riskLevel]
  );

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Please enter a valid amount'); return; }
    if (amt > balance) { setError('Insufficient balance'); return; }
    if (amt < company.minInvestment) { setError(`Minimum investment is ${sle(company.minInvestment)}`); return; }
    if (amt > maxInvestment) { setError(`Maximum for ${selectedMaturity.label} is ${sle(maxInvestment)}`); return; }

    setLoading(true);
    setError('');
    try {
      await onInvest(amt, selectedMaturity.days);
      onClose();
    } catch {
      setError('Investment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + selectedMaturity.days);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Invest in {company.ticker}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Company Info */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{company.name}</p>
                <div className="flex items-center gap-2 mt-1">
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
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Today's CPR</p>
                <p className={cn(
                  "text-xl font-bold",
                  company.cprToday >= 0 ? "text-success" : "text-destructive"
                )}>
                  {company.cprToday >= 0 ? '+' : ''}{company.cprToday.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <RiskWarning variant="compact" />

          {/* Investment Period */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Investment Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MATURITY_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setSelectedMaturity(option)}
                  className={cn(
                    "p-2.5 rounded-xl text-center transition-all border",
                    selectedMaturity.days === option.days
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:border-primary/50"
                  )}
                >
                  <p className="font-semibold text-xs">{option.label}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 p-2.5 bg-primary/5 rounded-xl border border-primary/20">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Matures:</span>
                  <span className="font-semibold text-primary">
                    {maturityDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-muted-foreground">Max: {sle(maxInvestment)}</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Amount (Balance: {sle(balance)})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder={`Min: ${sle(company.minInvestment)}`}
              className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          {/* Projections */}
          {investAmount > 0 && (
            <div className="glass-card p-4 bg-muted/50">
              <p className="text-sm font-medium mb-3">Projected Outcomes ({selectedMaturity.label})</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-[10px] text-muted-foreground">Best Case ({projections.bestPercent.toFixed(0)}%)</p>
                  <p className="font-bold text-success">{sle(projections.bestCase)}</p>
                  <p className="text-[10px] text-success">+{sle(projections.bestCase - investAmount)}</p>
                </div>
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-[10px] text-muted-foreground">Worst Case ({projections.worstPercent.toFixed(0)}%)</p>
                  <p className="font-bold text-destructive">{sle(projections.worstCase)}</p>
                  <p className="text-[10px] text-destructive">-{sle(investAmount - projections.worstCase)}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5 mt-3">
                <Info className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground">
                  Actual outcome depends on company CPR at maturity. Longer periods allow more price movement.
                </p>
              </div>
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
            By investing, you acknowledge the risks involved. Investments may result in loss.
          </p>
        </div>
      </div>
    </div>
  );
};