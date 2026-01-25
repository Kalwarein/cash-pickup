import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CPIData {
  company_id: string;
  cpi_score: number;
  recorded_at: string;
}

interface CompanyCPI {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  cpi_score: number;
  cpi_updated_at: string;
  is_trending: boolean;
  current_price: number;
  guaranteed_return_percent: number;
}

export const useCPI = () => {
  const [companies, setCompanies] = useState<CompanyCPI[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, ticker, sector, cpi_score, cpi_updated_at, is_trending, current_price, guaranteed_return_percent')
      .order('cpi_score', { ascending: false });

    if (!error && data) {
      setCompanies(data.map(c => ({
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        sector: c.sector,
        cpi_score: Number(c.cpi_score) || 50,
        cpi_updated_at: c.cpi_updated_at || new Date().toISOString(),
        is_trending: c.is_trending || false,
        current_price: Number(c.current_price) || 0,
        guaranteed_return_percent: Number(c.guaranteed_return_percent) || 25,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();

    // Subscribe to company updates
    const channel = supabase
      .channel('companies_cpi_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companies' },
        () => {
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchCompanies]);

  // Get top performers
  const topPerformers = companies.slice(0, 5);
  
  // Get rising companies (CPI > 60)
  const risingCompanies = companies.filter(c => c.cpi_score >= 60);
  
  // Get stable companies (CPI 40-60)
  const stableCompanies = companies.filter(c => c.cpi_score >= 40 && c.cpi_score < 60);
  
  // Get trending companies
  const trendingCompanies = companies.filter(c => c.is_trending);

  // Calculate average CPI
  const averageCPI = companies.length > 0 
    ? companies.reduce((sum, c) => sum + c.cpi_score, 0) / companies.length 
    : 50;

  return {
    companies,
    topPerformers,
    risingCompanies,
    stableCompanies,
    trendingCompanies,
    averageCPI,
    loading,
    refetch: fetchCompanies,
  };
};

export const useCPIHistory = (companyId: string) => {
  const [history, setHistory] = useState<CPIData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from('cpi_history')
        .select('*')
        .eq('company_id', companyId)
        .order('recorded_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setHistory(data.map(h => ({
          company_id: h.company_id,
          cpi_score: Number(h.cpi_score),
          recorded_at: h.recorded_at,
        })));
      }
      setLoading(false);
    };

    fetchHistory();

    // Subscribe to CPI history updates
    const channel = supabase
      .channel(`cpi_history_${companyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cpi_history', filter: `company_id=eq.${companyId}` },
        (payload) => {
          const newData = payload.new as CPIData;
          setHistory(prev => [...prev.slice(-49), {
            company_id: newData.company_id,
            cpi_score: Number(newData.cpi_score),
            recorded_at: newData.recorded_at,
          }]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId]);

  return { history, loading };
};
