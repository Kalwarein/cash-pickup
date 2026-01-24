import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Timer, Target, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  balance: number;
  onTrade: (amount: number, takeProfitPercent: number, stopLossPercent: number, durationMinutes: number) => Promise<void>;
}

const DURATION_OPTIONS = [
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
];

export const TradeModal = ({
  isOpen,
  onClose,
  currentPrice,
  balance,
  onTrade,
}: TradeModalProps) => {
  const [amount, setAmount] = useState('');
  const [takeProfitPercent, setTakeProfitPercent] = useState(5);
  const [stopLossPercent, setStopLossPercent] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const tradeAmount = parseFloat(amount);
    
    if (!tradeAmount || tradeAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (tradeAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (tradeAmount < 10) {
      setError('Minimum trade is $10');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onTrade(tradeAmount, takeProfitPercent, stopLossPercent, durationMinutes);
      onClose();
    } catch {
      setError('Trade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const takeProfitPrice = currentPrice * (1 + takeProfitPercent / 100);
  const stopLossPrice = currentPrice * (1 - stopLossPercent / 100);
  const potentialProfit = parseFloat(amount || '0') * (takeProfitPercent / 100);
  const potentialLoss = parseFloat(amount || '0') * (stopLossPercent / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-card rounded-t-3xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Open Trade</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Current Price */}
          <div className="glass-card p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Current Market Price</p>
            <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
          </div>

          {/* Warning */}
          <div className="glass-card p-3 flex items-start gap-3 bg-warning/5 border-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">High Risk Trading</p>
              <p className="text-xs text-muted-foreground">
                Short-term trades can result in significant losses. Trade responsibly.
              </p>
            </div>
          </div>

          {/* Trade Amount */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Trade Amount (Balance: ${balance.toFixed(2)})
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

          {/* Take Profit */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-success" />
              Take Profit: {takeProfitPercent}% (${takeProfitPrice.toFixed(2)})
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={takeProfitPercent}
              onChange={(e) => setTakeProfitPercent(Number(e.target.value))}
              className="w-full accent-success"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Stop Loss: {stopLossPercent}% (${stopLossPrice.toFixed(2)})
            </label>
            <input
              type="range"
              min="1"
              max="15"
              value={stopLossPercent}
              onChange={(e) => setStopLossPercent(Number(e.target.value))}
              className="w-full accent-destructive"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Max Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.minutes}
                  onClick={() => setDurationMinutes(option.minutes)}
                  className={cn(
                    "py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                    durationMinutes === option.minutes
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border hover:border-primary/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Potential Outcomes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 text-success mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Max Profit</span>
              </div>
              <p className="font-bold text-success">
                +${potentialProfit.toFixed(2)}
              </p>
            </div>
            <div className="glass-card p-3">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Max Loss</span>
              </div>
              <p className="font-bold text-destructive">
                -${potentialLoss.toFixed(2)}
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
            {loading ? 'Opening Trade...' : 'Open Trade'}
          </button>
        </div>
      </div>
    </div>
  );
};
