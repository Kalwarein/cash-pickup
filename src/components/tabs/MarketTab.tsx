import { useState, useEffect, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check for auto-close conditions every 1 second for instant TP/SL closure
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice > 0) {
        checkAndCloseTrades(currentPrice);
      }
    }, 1000);

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

  if (marketLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-6 h-[400px] loading-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("relative animate-fade-in", isFullscreen && "z-50")}>
      {/* Chart-first, fullscreen-capable market surface */}
      <div className="relative">
        <CandlestickChart
          data={chartData}
          height={isFullscreen ? undefined : 520}
          trades={tradeOverlays}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        />

        {/* Floating overlay trade button (always visible, does not resize chart) */}
        <button
          onClick={() => setShowTradeModal(true)}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-2 rounded-xl font-semibold shadow-lg transition-all",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            isFullscreen ? "bottom-6 px-6 py-4 text-lg" : "bottom-4 px-5 py-3 text-base"
          )}
        >
          <DollarSign className="w-5 h-5" />
          Open Trade
        </button>

        {/* Tiny live status pill (kept minimal, doesn't compete with chart) */}
        <div className={cn(
          "absolute left-3 top-3 z-20 px-2 py-1 rounded-lg text-xs font-medium",
          "bg-background/80 backdrop-blur-sm border border-border text-muted-foreground"
        )}>
          LIVE • {marketStatus.message} • ${currentPrice.toFixed(2)}
        </div>
      </div>

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
