import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, CandlestickChart as CandlestickIcon, LineChart } from 'lucide-react';
import { MarketChart } from '@/components/MarketChart';
import { CandlestickChart } from '@/components/CandlestickChart';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import { useForexTrades } from '@/hooks/useForexTrades';
import { useWallet } from '@/hooks/useWallet';
import { TradeModal } from '@/components/TradeModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MarketTab = () => {
  const { chartData, currentPrice, marketStatus, loading: marketLoading } = useMarketCandles();
  const { openTrades, openTrade, checkAndCloseTrades } = useForexTrades();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check for auto-close conditions every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice > 0) {
        checkAndCloseTrades(currentPrice);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentPrice, checkAndCloseTrades]);

  // Convert open trades to overlay format for the chart
  const tradeOverlays = useMemo(() => {
    return openTrades.map(trade => ({
      id: trade.id,
      entryPrice: trade.entry_price,
      takeProfit: trade.take_profit,
      stopLoss: trade.stop_loss,
    }));
  }, [openTrades]);

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

  const previousValue = chartData[0]?.value || 0;
  const changePercent = previousValue ? ((currentPrice - previousValue) / previousValue) * 100 : 0;
  const isPositive = changePercent >= 0;

  if (marketLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 h-[400px] loading-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 animate-fade-in", isFullscreen && "fixed inset-0 z-50 bg-background p-4")}>
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
      <div className={cn("glass-card p-4 glow-primary", isFullscreen && "flex-1")}>
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
          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  chartType === 'line' ? "bg-background shadow-sm" : "hover:bg-muted"
                )}
                title="Line Chart"
              >
                <LineChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  chartType === 'candlestick' ? "bg-background shadow-sm" : "hover:bg-muted"
                )}
                title="Candlestick Chart"
              >
                <CandlestickIcon className="w-4 h-4" />
              </button>
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
        </div>

        {chartType === 'candlestick' ? (
          <CandlestickChart 
            data={chartData} 
            height={isFullscreen ? undefined : 350} 
            trades={tradeOverlays}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        ) : (
          <MarketChart data={chartData} height={isFullscreen ? 500 : 280} showAxis />
        )}
      </div>

      {/* Trade Button */}
      {!isFullscreen && (
        <button
          onClick={() => setShowTradeModal(true)}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <DollarSign className="w-5 h-5" />
          Open Trade
        </button>
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
