import { useState, useEffect, useCallback, useRef } from 'react';
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
  const isInitializedRef = useRef<Record<string, boolean>>({});

  const fetchPriceHistory = useCallback(async () => {
    if (!companyId) return;

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
        change_percent: Number(p.change_percent),
      }));
      
      setPriceHistory(history);
      setCurrentPrice(history[history.length - 1].price);
      
      setChartData(history.map(p => ({
        time: new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: p.price,
        timestamp: new Date(p.timestamp).getTime(),
      })));
    }
    setLoading(false);
  }, [companyId]);

  // Initialize company with price history if empty
  const initializePriceHistory = useCallback(async () => {
    if (!companyId || isInitializedRef.current[companyId]) return;
    isInitializedRef.current[companyId] = true;

    // Get company's current price
    const { data: company } = await supabase
      .from('companies')
      .select('current_price')
      .eq('id', companyId)
      .single();

    if (!company) return;

    // Check if history exists
    const { count } = await supabase
      .from('company_price_history')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (count === 0) {
      // Generate 30 days of historical data
      let price = Number(company.current_price);
      const history = [];
      const now = Date.now();
      
      for (let i = 30; i >= 0; i--) {
        const change = (Math.random() - 0.48) * 3;
        price = Math.max(price * 0.5, Math.min(price * 1.5, price * (1 + change / 100)));
        
        history.push({
          company_id: companyId,
          timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
          price: Math.round(price * 100) / 100,
          change_percent: Math.round(change * 100) / 100,
        });
      }

      await supabase.from('company_price_history').insert(history);
    }

    await fetchPriceHistory();
  }, [companyId, fetchPriceHistory]);

  useEffect(() => {
    if (companyId) {
      initializePriceHistory();
    }
  }, [companyId, initializePriceHistory]);

  return {
    priceHistory,
    chartData,
    currentPrice,
    loading,
    refetch: fetchPriceHistory,
  };
};
