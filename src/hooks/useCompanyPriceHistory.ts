import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PricePoint {
  id: string;
  timestamp: string;
  price: number;
  change_percent: number;
}

interface ChartPoint {
  time: string;
  value: number;
  timestamp: number;
}

export const useCompanyPriceHistory = (companyId: string | null) => {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPriceHistory = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('company_price_history')
      .select('*')
      .eq('company_id', companyId)
      .order('timestamp', { ascending: true })
      .limit(100);

    if (!error && data && data.length > 0) {
      const history = data.map(p => ({
        id: p.id,
        timestamp: p.timestamp,
        price: Number(p.price),
        change_percent: Number(p.change_percent || 0),
      }));
      
      setPriceHistory(history);
      setCurrentPrice(history[history.length - 1].price);
      
      // Format chart data with proper time labels (dates for daily data)
      setChartData(history.map(p => ({
        time: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: p.price,
        timestamp: new Date(p.timestamp).getTime(),
      })));
    } else {
      // No data - set empty states
      setPriceHistory([]);
      setChartData([]);
      setCurrentPrice(0);
    }
    
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchPriceHistory();
  }, [fetchPriceHistory]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`company_price_${companyId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'company_price_history',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newPrice = payload.new;
          const pricePoint: PricePoint = {
            id: newPrice.id,
            timestamp: newPrice.timestamp,
            price: Number(newPrice.price),
            change_percent: Number(newPrice.change_percent || 0),
          };
          
          setPriceHistory(prev => {
            if (prev.some(p => p.id === pricePoint.id)) return prev;
            return [...prev.slice(-99), pricePoint];
          });
          
          setCurrentPrice(pricePoint.price);
          
          setChartData(prev => {
            const newPoint: ChartPoint = {
              time: new Date(pricePoint.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              value: pricePoint.price,
              timestamp: new Date(pricePoint.timestamp).getTime(),
            };
            if (prev.some(p => p.timestamp === newPoint.timestamp)) return prev;
            return [...prev.slice(-99), newPoint];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId]);

  return {
    priceHistory,
    chartData,
    currentPrice,
    loading,
    refetch: fetchPriceHistory,
  };
};
