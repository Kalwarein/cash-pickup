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
  guaranteed_return_percent: number;
  cpi_score?: number;
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
        guaranteed_return_percent: Number(c.guaranteed_return_percent) || 25,
        risk_level: c.risk_level as 'Low' | 'Medium' | 'High',
        cpi_score: Number(c.cpi_score) || 50,
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
                    cpi_score: (updated as { cpi_score?: number }).cpi_score !== undefined ? Number((updated as { cpi_score?: number }).cpi_score) : c.cpi_score,
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
