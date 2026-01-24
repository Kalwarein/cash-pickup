import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyCandle {
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

export const useCompanyCandles = (companyId: string | null) => {
  const [candles, setCandles] = useState<CompanyCandle[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const lastCandleRef = useRef<CompanyCandle | null>(null);

  const convertToChartData = useCallback((candleData: CompanyCandle[]): ChartPoint[] => {
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

  const fetchCandles = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('company_candles')
      .select('*')
      .eq('company_id', companyId)
      .order('timestamp', { ascending: true })
      .limit(200);

    if (!error && data && data.length > 0) {
      const typedCandles: CompanyCandle[] = data.map(c => ({
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
    } else {
      setCandles([]);
      setChartData([]);
      setCurrentPrice(0);
    }
    
    setLoading(false);
  }, [companyId, convertToChartData]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`company_candles_${companyId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'company_candles',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newCandle = payload.new;
          const typedCandle: CompanyCandle = {
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
            return [...prev.slice(-199), typedCandle];
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
  }, [companyId]);

  return {
    candles,
    chartData,
    currentPrice,
    loading,
    refetch: fetchCandles,
  };
};
