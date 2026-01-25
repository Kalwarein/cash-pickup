import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketCandle {
  id: string;
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
}

interface ChartPoint {
  time: string;
  value: number;
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export const useMarketCandles = () => {
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1000);
  const [loading, setLoading] = useState(true);
  const lastCandleRef = useRef<MarketCandle | null>(null);

  // Convert candles to chart data format
  const convertToChartData = useCallback((candleData: MarketCandle[]): ChartPoint[] => {
    return candleData.map(c => ({
      time: new Date(c.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      value: c.close_price,
      open: c.open_price,
      high: c.high_price,
      low: c.low_price,
      close: c.close_price,
      timestamp: new Date(c.timestamp).getTime(),
    }));
  }, []);

  // Fetch existing candles from database
  const fetchCandles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(200);

    if (!error && data && data.length > 0) {
      const typedCandles: MarketCandle[] = data.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        open_price: Number(c.open_price),
        high_price: Number(c.high_price),
        low_price: Number(c.low_price),
        close_price: Number(c.close_price),
        volume: Number(c.volume || 0),
      }));
      
      setCandles(typedCandles);
      lastCandleRef.current = typedCandles[typedCandles.length - 1];
      setCurrentPrice(typedCandles[typedCandles.length - 1].close_price);
      setChartData(convertToChartData(typedCandles));
    }
    setLoading(false);
  }, [convertToChartData]);

  // Subscribe to realtime updates for new candles
  useEffect(() => {
    fetchCandles();

    const channel = supabase
      .channel('market_candles_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_candles' },
        (payload) => {
          const newCandle = payload.new as MarketCandle;
          const typedCandle: MarketCandle = {
            id: newCandle.id,
            timestamp: newCandle.timestamp,
            open_price: Number(newCandle.open_price),
            high_price: Number(newCandle.high_price),
            low_price: Number(newCandle.low_price),
            close_price: Number(newCandle.close_price),
            volume: Number(newCandle.volume || 0),
          };
          
          lastCandleRef.current = typedCandle;
          setCurrentPrice(typedCandle.close_price);
          
          setCandles(prev => {
            if (prev.some(c => c.id === typedCandle.id)) return prev;
            const updated = [...prev.slice(-199), typedCandle];
            return updated;
          });
          
          setChartData(prev => {
            const newPoint: ChartPoint = {
              time: new Date(typedCandle.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              value: typedCandle.close_price,
              open: typedCandle.open_price,
              high: typedCandle.high_price,
              low: typedCandle.low_price,
              close: typedCandle.close_price,
              timestamp: new Date(typedCandle.timestamp).getTime(),
            };
            if (prev.some(p => p.timestamp === newPoint.timestamp)) return prev;
            return [...prev.slice(-199), newPoint];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchCandles]);

  // Calculate market status from candles
  const getMarketStatus = useCallback(() => {
    if (chartData.length < 5) {
      return { status: 'rising' as const, message: 'Market Rising', sentiment: 50 };
    }
    
    const recentValues = chartData.slice(-5).map(d => d.value);
    const avgChange = ((recentValues[recentValues.length - 1] - recentValues[0]) / recentValues[0]) * 100;
    
    if (avgChange > 1) {
      return { status: 'rising' as const, message: 'Market Rising', sentiment: Math.min(100, 60 + avgChange * 5) };
    } else if (avgChange < -1) {
      return { status: 'falling' as const, message: 'Market Falling', sentiment: Math.max(-100, -60 + avgChange * 5) };
    } else {
      return { status: 'volatile' as const, message: 'High Volatility', sentiment: avgChange * 20 };
    }
  }, [chartData]);

  return {
    candles,
    chartData,
    currentPrice,
    loading,
    marketStatus: getMarketStatus(),
    refetch: fetchCandles,
  };
};
