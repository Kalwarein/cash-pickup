import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CPRHistory {
  company_id: string;
  cpr_value: number;
  recorded_date: string;
}

interface CompanyCPR {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  risk_level: 'Low' | 'Medium' | 'High';
  cpr_today: number;
  cpr_yesterday: number;
  cpr_7day_avg: number;
  cpr_30day_avg: number;
  cpr_best: number;
  cpr_worst: number;
  cpr_volatility: number;
  cpr_trend: 'improving' | 'declining' | 'stable' | 'unstable';
  cpr_last_generated_date: string;
  is_trending: boolean;
  is_silent_performer: boolean;
  current_price: number;
  min_investment: number;
}

export const useCPR = () => {
  const [companies, setCompanies] = useState<CompanyCPR[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, ticker, sector, risk_level, cpr_today, cpr_yesterday, cpr_7day_avg, cpr_30day_avg, cpr_best, cpr_worst, cpr_volatility, cpr_trend, cpr_last_generated_date, is_trending, is_silent_performer, current_price, min_investment')
      .order('cpr_today', { ascending: false });

    if (!error && data) {
      setCompanies(data.map(c => ({
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        sector: c.sector,
        risk_level: c.risk_level as 'Low' | 'Medium' | 'High',
        cpr_today: Number(c.cpr_today) || 0,
        cpr_yesterday: Number(c.cpr_yesterday) || 0,
        cpr_7day_avg: Number(c.cpr_7day_avg) || 0,
        cpr_30day_avg: Number(c.cpr_30day_avg) || 0,
        cpr_best: Number(c.cpr_best) || 0,
        cpr_worst: Number(c.cpr_worst) || 0,
        cpr_volatility: Number(c.cpr_volatility) || 0,
        cpr_trend: (c.cpr_trend as 'improving' | 'declining' | 'stable' | 'unstable') || 'stable',
        cpr_last_generated_date: c.cpr_last_generated_date || new Date().toISOString().split('T')[0],
        is_trending: c.is_trending || false,
        is_silent_performer: c.is_silent_performer || false,
        current_price: Number(c.current_price) || 0,
        min_investment: Number(c.min_investment) || 50,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();

    const channel = supabase
      .channel('companies_cpr_updates')
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

  // Get companies by performance
  const positiveCompanies = companies.filter(c => c.cpr_today > 0);
  const negativeCompanies = companies.filter(c => c.cpr_today < 0);
  const neutralCompanies = companies.filter(c => c.cpr_today === 0);
  
  // Get top performers (positive CPR)
  const topPerformers = positiveCompanies.slice(0, 5);
  
  // Get high risk companies (high volatility or deep negative)
  const highRiskCompanies = companies.filter(c => c.cpr_volatility > 30 || c.cpr_today < -30);
  
  // Get stable companies (low volatility)
  const stableCompanies = companies.filter(c => c.cpr_volatility < 15 && c.cpr_today > -20);

  // Calculate platform average CPR
  const averageCPR = companies.length > 0 
    ? companies.reduce((sum, c) => sum + c.cpr_today, 0) / companies.length 
    : 0;

  return {
    companies,
    topPerformers,
    positiveCompanies,
    negativeCompanies,
    neutralCompanies,
    highRiskCompanies,
    stableCompanies,
    averageCPR,
    loading,
    refetch: fetchCompanies,
  };
};

export const useCPRHistory = (companyId: string) => {
  const [history, setHistory] = useState<CPRHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from('cpr_history')
        .select('*')
        .eq('company_id', companyId)
        .order('recorded_date', { ascending: true })
        .limit(30);

      if (!error && data) {
        setHistory(data.map(h => ({
          company_id: h.company_id,
          cpr_value: Number(h.cpr_value),
          recorded_date: h.recorded_date,
        })));
      }
      setLoading(false);
    };

    fetchHistory();

    const channel = supabase
      .channel(`cpr_history_${companyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cpr_history', filter: `company_id=eq.${companyId}` },
        (payload) => {
          const newData = payload.new as CPRHistory;
          setHistory(prev => [...prev.slice(-29), {
            company_id: newData.company_id,
            cpr_value: Number(newData.cpr_value),
            recorded_date: newData.recorded_date,
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
