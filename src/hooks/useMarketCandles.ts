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
  const isGeneratingRef = useRef(false);

  // Fetch existing candles from database
  const fetchCandles = useCallback(async () => {
    const { data, error } = await supabase
      .from('market_candles')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(200);

    if (!error && data && data.length > 0) {
      const typedCandles = data.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        open_price: Number(c.open_price),
        high_price: Number(c.high_price),
        low_price: Number(c.low_price),
        close_price: Number(c.close_price),
        volume: Number(c.volume),
      }));
      setCandles(typedCandles);
      lastCandleRef.current = typedCandles[typedCandles.length - 1];
      setCurrentPrice(typedCandles[typedCandles.length - 1].close_price);
      
      // Convert to chart data
      const chartPoints = typedCandles.map(c => ({
        time: new Date(c.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: c.close_price,
        open: c.open_price,
        high: c.high_price,
        low: c.low_price,
        close: c.close_price,
        timestamp: new Date(c.timestamp).getTime(),
      }));
      setChartData(chartPoints);
    }
    setLoading(false);
  }, []);

  // Generate new candle (only happens once every minute to keep data persistent)
  const generateCandle = useCallback(async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    const lastCandle = lastCandleRef.current;
    const prevClose = lastCandle?.close_price || 1000;
    
    // Realistic market movement with trends
    const trend = Math.random();
    let priceChange: number;
    
    if (trend > 0.7) {
      // Strong up movement
      priceChange = prevClose * (Math.random() * 0.02 + 0.005);
    } else if (trend < 0.3) {
      // Strong down movement
      priceChange = -prevClose * (Math.random() * 0.02 + 0.005);
    } else {
      // Sideways with slight bias up
      priceChange = prevClose * (Math.random() - 0.45) * 0.015;
    }

    const newClose = Math.max(500, Math.min(2000, prevClose + priceChange));
    const volatility = Math.random() * 0.01;
    
    const open = prevClose;
    const close = Math.round(newClose * 100) / 100;
    const high = Math.round(Math.max(open, close) * (1 + volatility) * 100) / 100;
    const low = Math.round(Math.min(open, close) * (1 - volatility) * 100) / 100;
    const volume = Math.round(Math.random() * 100000 + 50000);

    const { data, error } = await supabase
      .from('market_candles')
      .insert({
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume: volume,
      })
      .select()
      .single();

    if (!error && data) {
      const newCandle: MarketCandle = {
        id: data.id,
        timestamp: data.timestamp,
        open_price: Number(data.open_price),
        high_price: Number(data.high_price),
        low_price: Number(data.low_price),
        close_price: Number(data.close_price),
        volume: Number(data.volume),
      };
      
      lastCandleRef.current = newCandle;
      setCurrentPrice(newCandle.close_price);
      
      setCandles(prev => [...prev.slice(-199), newCandle]);
      setChartData(prev => [...prev.slice(-199), {
        time: new Date(newCandle.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: newCandle.close_price,
        open: newCandle.open_price,
        high: newCandle.high_price,
        low: newCandle.low_price,
        close: newCandle.close_price,
        timestamp: new Date(newCandle.timestamp).getTime(),
      }]);
    }

    isGeneratingRef.current = false;
  }, []);

  // Initialize market with seed data if empty
  const initializeMarket = useCallback(async () => {
    const { count, error } = await supabase
      .from('market_candles')
      .select('*', { count: 'exact', head: true });

    if (!error && (count === 0 || count === null)) {
      // Seed with historical data
      let price = 1000;
      const candles = [];
      const now = Date.now();
      
      for (let i = 60; i >= 0; i--) {
        const trend = Math.random();
        let change = price * (Math.random() - 0.48) * 0.015;
        if (trend > 0.65) change = Math.abs(change);
        if (trend < 0.35) change = -Math.abs(change);
        
        price = Math.max(800, Math.min(1200, price + change));
        const volatility = Math.random() * 0.008;
        
        candles.push({
          timestamp: new Date(now - i * 60000).toISOString(),
          open_price: Math.round((price - change / 2) * 100) / 100,
          close_price: Math.round(price * 100) / 100,
          high_price: Math.round(price * (1 + volatility) * 100) / 100,
          low_price: Math.round(price * (1 - volatility) * 100) / 100,
          volume: Math.round(Math.random() * 100000 + 50000),
        });
      }

      await supabase.from('market_candles').insert(candles);
    }
    
    await fetchCandles();
  }, [fetchCandles]);

  // Subscribe to realtime updates
  useEffect(() => {
    initializeMarket();

    const channel = supabase
      .channel('market_candles_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_candles' },
        (payload) => {
          const newCandle = payload.new as MarketCandle;
          const typedCandle = {
            ...newCandle,
            open_price: Number(newCandle.open_price),
            high_price: Number(newCandle.high_price),
            low_price: Number(newCandle.low_price),
            close_price: Number(newCandle.close_price),
            volume: Number(newCandle.volume),
          };
          
          lastCandleRef.current = typedCandle;
          setCurrentPrice(typedCandle.close_price);
          
          setCandles(prev => {
            if (prev.some(c => c.id === typedCandle.id)) return prev;
            return [...prev.slice(-199), typedCandle];
          });
          
          setChartData(prev => {
            const newPoint = {
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

    // Generate new candle every minute (persistent market)
    const interval = setInterval(() => {
      generateCandle();
    }, 60000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [initializeMarket, generateCandle]);

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
    generateCandle,
    refetch: fetchCandles,
  };
};
