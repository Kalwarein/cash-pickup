import { useState } from 'react';
import { History, TrendingUp, TrendingDown, Target, XCircle, Clock, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForexTrades } from '@/hooks/useForexTrades';
import { sle, formatSLE } from '@/lib/currency';

interface TradeDetailModalProps {
  trade: {
    id: string;
    entry_price: number;
    exit_price: number | null;
    amount: number;
    take_profit: number;
    stop_loss: number;
    max_duration_minutes: number;
    expires_at: string;
    status: string;
    profit_loss: number;
    closed_at: string | null;
    created_at: string;
  };
  onClose: () => void;
}

const TradeDetailModal = ({ trade, onClose }: TradeDetailModalProps) => {
  const isProfit = trade.profit_loss >= 0;
  const statusLabels: Record<string, string> = {
    'closed_tp': 'Take Profit Hit',
    'closed_sl': 'Stop Loss Hit',
    'closed_expired': 'Expired',
    'closed_manual': 'Manually Closed',
    'open': 'Open',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md mx-4 bg-card rounded-2xl p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Trade Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <div className={cn(
              "px-4 py-2 rounded-xl font-semibold flex items-center gap-2",
              isProfit ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
            )}>
              {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              {formatSLE(trade.profit_loss, true)}
            </div>
          </div>

          {/* Trade Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Amount</p>
              <p className="font-semibold">{sle(trade.amount)}</p>
            </div>
            <div className="glass-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="font-semibold text-sm">{statusLabels[trade.status] || trade.status}</p>
            </div>
            <div className="glass-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
              <p className="font-semibold">{sle(trade.entry_price)}</p>
            </div>
            <div className="glass-card p-3">
              <p className="text-xs text-muted-foreground mb-1">Exit Price</p>
              <p className="font-semibold">{trade.exit_price ? sle(trade.exit_price) : '-'}</p>
            </div>
          </div>

          {/* TP/SL Info */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-success text-sm">
                <Target className="w-4 h-4" />
                Take Profit: {sle(trade.take_profit)}
              </span>
              <span className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="w-4 h-4" />
                Stop Loss: {sle(trade.stop_loss)}
              </span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="glass-card p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Opened</span>
              <span>{new Date(trade.created_at).toLocaleString()}</span>
            </div>
            {trade.closed_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Closed</span>
                <span>{new Date(trade.closed_at).toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span>{trade.max_duration_minutes} minutes max</span>
            </div>
          </div>

          {/* Return Info */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Final Return</span>
              <span className={cn(
                "font-bold",
                isProfit ? "text-success" : "text-destructive"
              )}>
                {sle(trade.amount + trade.profit_loss)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground text-sm">Return %</span>
              <span className={cn(
                "font-bold",
                isProfit ? "text-success" : "text-destructive"
              )}>
                {isProfit ? '+' : ''}{((trade.profit_loss / trade.amount) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TradeHistory = () => {
  const { trades, loading } = useForexTrades();
  const [selectedTrade, setSelectedTrade] = useState<typeof trades[0] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const closedTrades = trades.filter(t => t.status !== 'open');
  const displayedTrades = showAll ? closedTrades : closedTrades.slice(0, 5);

  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit_loss > 0 ? t.profit_loss : 0), 0);
  const totalLoss = closedTrades.reduce((sum, t) => sum + (t.profit_loss < 0 ? Math.abs(t.profit_loss) : 0), 0);
  const winRate = closedTrades.length > 0 
    ? (closedTrades.filter(t => t.profit_loss > 0).length / closedTrades.length) * 100 
    : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'closed_tp':
        return <Target className="w-4 h-4 text-success" />;
      case 'closed_sl':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'closed_expired':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="glass-card p-4 h-32 loading-pulse" />;
  }

  return (
    <>
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Trade History</h3>
          </div>
          <span className="text-sm text-muted-foreground">{closedTrades.length} trades</span>
        </div>

        {/* Stats */}
        {closedTrades.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-bold text-sm">{winRate.toFixed(0)}%</p>
            </div>
            <div className="text-center p-2 bg-success/10 rounded-lg">
              <p className="text-xs text-success">Profits</p>
              <p className="font-bold text-sm text-success">+{sle(totalProfit)}</p>
            </div>
            <div className="text-center p-2 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive">Losses</p>
              <p className="font-bold text-sm text-destructive">-{sle(totalLoss)}</p>
            </div>
          </div>
        )}

        {/* Trade List */}
        {closedTrades.length > 0 ? (
          <div className="space-y-2">
            {displayedTrades.map((trade) => {
              const isProfit = trade.profit_loss >= 0;
              return (
                <button
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className="w-full p-3 bg-muted/50 rounded-xl flex items-center justify-between hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      isProfit ? "bg-success/20" : "bg-destructive/20"
                    )}>
                      {getStatusIcon(trade.status)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sle(trade.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.closed_at || trade.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-bold",
                      isProfit ? "text-success" : "text-destructive"
                    )}>
                      {formatSLE(trade.profit_loss, true)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
            
            {closedTrades.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-center text-sm text-primary font-medium hover:underline"
              >
                {showAll ? 'Show Less' : `View All ${closedTrades.length} Trades`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No closed trades yet</p>
        )}
      </div>

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </>
  );
};
