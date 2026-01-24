import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  risk_level: 'Low' | 'Medium' | 'High';
  current_price: number;
  price_change_percent: number;
  min_return_percent: number;
  max_return_percent: number;
  is_trending: boolean;
}

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('is_trending', { ascending: false });

    if (!error && data) {
      setCompanies(data.map(c => ({
        ...c,
        current_price: Number(c.current_price),
        price_change_percent: Number(c.price_change_percent),
        min_return_percent: Number(c.min_return_percent),
        max_return_percent: Number(c.max_return_percent),
        risk_level: c.risk_level as 'Low' | 'Medium' | 'High',
      })));
    }
    setLoading(false);
  }, []);

  // Simulate price changes
  useEffect(() => {
    const interval = setInterval(() => {
      setCompanies(prev => prev.map(company => {
        const changePercent = (Math.random() - 0.5) * 4;
        const newPrice = company.current_price * (1 + changePercent / 100);
        return {
          ...company,
          current_price: Math.round(newPrice * 100) / 100,
          price_change_percent: Math.round(changePercent * 100) / 100,
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, loading, refetch: fetchCompanies };
};
