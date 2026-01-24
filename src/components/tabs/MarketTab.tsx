import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Clock, DollarSign, Target, XCircle, Timer } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import { useForexTrades } from '@/hooks/useForexTrades';
import { useWallet } from '@/hooks/useWallet';
import { TradeModal } from '@/components/TradeModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MarketTab = () => {
  const { chartData, currentPrice, marketStatus, loading: marketLoading } = useMarketCandles();
  const { openTrades, trades, openTrade, closeTrade, checkAndCloseTrades, calculateUnrealizedPL } = useForexTrades();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [showTradeModal, setShowTradeModal] = useState(false);

  // Check for auto-close conditions every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice > 0) {
        checkAndCloseTrades(currentPrice);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPrice, checkAndCloseTrades]);

  const handleOpenTrade = async (
    amount: number,
    takeProfitPercent: number,
    stopLossPercent: number,
    durationMinutes: number
  ) => {
    const { error } = await openTrade(currentPrice, amount, takeProfitPercent, stopLossPercent, durationMinutes);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Trade opened at $${currentPrice.toFixed(2)}`);
      await refetchWallet();
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    const { error, profitLoss } = await closeTrade(tradeId, currentPrice);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Trade closed: ${profitLoss && profitLoss >= 0 ? '+' : ''}$${profitLoss?.toFixed(2)}`);
      await refetchWallet();
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expiring...';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const previousValue = chartData[0]?.value || 0;
  const changePercent = previousValue ? ((currentPrice - previousValue) / previousValue) * 100 : 0;
  const isPositive = changePercent >= 0;
  const unrealizedPL = calculateUnrealizedPL(currentPrice);

  if (marketLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 h-[400px] loading-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market</h1>
          <p className="text-muted-foreground text-sm">SLE Market Index</p>
        </div>
        <div className="flex items-center gap-2 text-success">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">LIVE</span>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-card p-4 glow-primary">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">SLE Index</p>
            <p className="text-3xl font-bold">${currentPrice.toFixed(2)}</p>
            <div className={cn(
              "flex items-center gap-2 mt-1",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-semibold">{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
            </div>
          </div>
          <div className={cn(
            "px-3 py-1.5 rounded-xl text-sm font-medium",
            marketStatus.status === 'rising' && "bg-success/10 text-success",
            marketStatus.status === 'falling' && "bg-destructive/10 text-destructive",
            marketStatus.status === 'volatile' && "bg-warning/10 text-warning"
          )}>
            {marketStatus.message}
          </div>
        </div>

        <MarketChart data={chartData} height={220} showAxis />
      </div>

      {/* Trade Button */}
      <button
        onClick={() => setShowTradeModal(true)}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
      >
        <DollarSign className="w-5 h-5" />
        Open Trade
      </button>

      {/* Open Trades */}
      {openTrades.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Open Trades</h3>
            <span className={cn(
              "text-sm font-medium",
              unrealizedPL >= 0 ? "text-success" : "text-destructive"
            )}>
              P/L: {unrealizedPL >= 0 ? '+' : ''}${unrealizedPL.toFixed(2)}
            </span>
          </div>
          
          <div className="space-y-3">
            {openTrades.map((trade) => {
              const priceChange = (currentPrice - trade.entry_price) / trade.entry_price;
              const currentPL = trade.amount * priceChange;
              
              return (
                <div key={trade.id} className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        currentPL >= 0 ? "bg-success/20" : "bg-destructive/20"
                      )}>
                        {currentPL >= 0 ? <TrendingUp className="w-4 h-4 text-success" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">${trade.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Entry: ${trade.entry_price.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        currentPL >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {currentPL >= 0 ? '+' : ''}${currentPL.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Timer className="w-3 h-3" />
                        {getTimeRemaining(trade.expires_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="flex items-center gap-1 text-success">
                      <Target className="w-3 h-3" />
                      TP: ${trade.take_profit.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-3 h-3" />
                      SL: ${trade.stop_loss.toFixed(2)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleCloseTrade(trade.id)}
                    className="w-full py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Close Trade
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-bold text-sm">${wallet?.balance.toFixed(0) || 0}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-warning" />
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="font-bold text-sm">{openTrades.length}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-sm">{trades.length}</p>
        </div>
      </div>

      {/* Recent Trades */}
      {trades.filter(t => t.status !== 'open').length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-semibold mb-3">Recent Trades</h3>
          <div className="space-y-2">
            {trades.filter(t => t.status !== 'open').slice(0, 5).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    trade.profit_loss >= 0 ? "bg-success/20" : "bg-destructive/20"
                  )}>
                    {trade.profit_loss >= 0 ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm">${trade.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {trade.status.replace('closed_', '').toUpperCase()}
                    </p>
                  </div>
                </div>
                <p className={cn(
                  "font-semibold text-sm",
                  trade.profit_loss >= 0 ? "text-success" : "text-destructive"
                )}>
                  {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {showTradeModal && wallet && (
        <TradeModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          currentPrice={currentPrice}
          balance={wallet.balance}
          onTrade={handleOpenTrade}
        />
      )}
    </div>
  );
};
