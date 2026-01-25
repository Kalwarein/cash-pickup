import { useState, useEffect, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { CandlestickChart } from '@/components/CandlestickChart';
import { useMarketCandles } from '@/hooks/useMarketCandles';
import { useForexTrades } from '@/hooks/useForexTrades';
import { useWallet } from '@/hooks/useWallet';
import { TradeModal } from '@/components/TradeModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

export const MarketTab = () => {
  const { chartData, currentPrice, marketStatus, loading: marketLoading } = useMarketCandles();
  const { openTrades, openTrade, checkAndCloseTrades } = useForexTrades();
  const { wallet, refetch: refetchWallet } = useWallet();
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

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
      toast.success(`Trade opened at ${sle(currentPrice)}`);
      await refetchWallet();
    }
  };

  // Calculate chart height to fill screen minus bottom nav and padding
  const chartHeight = typeof window !== 'undefined' 
    ? window.innerHeight - 180 // Account for bottom nav (~80px) + some padding
    : 500;

  if (marketLoading) {
    return (
      <div className="fixed inset-0 top-0 left-0 right-0 bottom-20 flex items-center justify-center bg-background">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
          <span className="text-xl font-bold text-primary-foreground">CP</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-0 top-0 left-0 right-0 bottom-20 bg-background animate-fade-in",
      isFullscreen && "bottom-0 z-50"
    )}>
      {/* Full-screen chart container */}
      <div className="relative w-full h-full">
        <CandlestickChart
          data={chartData}
          height={isFullscreen ? window.innerHeight - 40 : chartHeight}
          trades={tradeOverlays}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
        />

        {/* Floating overlay trade button */}
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

        {/* Live status pill */}
        <div className={cn(
          "absolute left-3 top-3 z-20 px-3 py-1.5 rounded-lg text-xs font-medium",
          "bg-background/90 backdrop-blur-sm border border-border"
        )}>
          <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse mr-2" />
          <span className="text-foreground font-semibold">{sle(currentPrice)}</span>
          <span className="text-muted-foreground ml-2">• {marketStatus.message}</span>
        </div>

        {/* Auto-scroll status indicator */}
        <div className={cn(
          "absolute right-3 bottom-16 z-20 px-2 py-1 rounded-lg text-xs",
          "bg-background/80 backdrop-blur-sm border border-border text-muted-foreground"
        )}>
          {autoScroll ? "Auto-follow: ON" : "Auto-follow: OFF"}
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
