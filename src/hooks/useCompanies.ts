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
  min_investment: number;
  cpr_today: number;
  cpr_7day_avg: number;
  market_cap: number;
  country: 'SL' | 'INT';
}

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

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
        min_investment: Number(c.min_investment) || 50,
        risk_level: c.risk_level as 'Low' | 'Medium' | 'High',
        cpr_today: Number(c.cpr_today) || 0,
        cpr_7day_avg: Number(c.cpr_7day_avg) || 0,
        market_cap: Number((c as { market_cap?: number }).market_cap) || 0,
        country: ((c as { country?: string }).country === 'SL' ? 'SL' : 'INT') as 'SL' | 'INT',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const channel = supabase
      .channel('companies_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'companies' },
        (payload) => {
          const updated = payload.new as Partial<Company> & { id: string };
          setCompanies((prev) =>
            prev.map((c) =>
              c.id !== updated.id
                ? c
                : {
                    ...c,
                    current_price: updated.current_price !== undefined ? Number(updated.current_price) : c.current_price,
                    price_change_percent:
                      updated.price_change_percent !== undefined ? Number(updated.price_change_percent) : c.price_change_percent,
                    cpr_today: (updated as { cpr_today?: number }).cpr_today !== undefined ? Number((updated as { cpr_today?: number }).cpr_today) : c.cpr_today,
                  },
            ),
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return { companies, loading, refetch: fetchCompanies, selectedCompanyId, setSelectedCompanyId };
};
