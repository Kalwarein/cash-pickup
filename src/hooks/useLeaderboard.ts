import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  user_name: string;
  total_profit: number;
  total_investments: number;
  total_trades: number;
  win_rate: number;
  rank_by_profit: number;
  rank_by_volume: number;
}

interface CompanyLeader {
  company_id: string;
  company_name: string;
  company_ticker: string;
  total_invested: number;
  investor_count: number;
  avg_return: number;
}

export const useLeaderboard = () => {
  const [topByProfit, setTopByProfit] = useState<LeaderboardEntry[]>([]);
  const [topByVolume, setTopByVolume] = useState<LeaderboardEntry[]>([]);
  const [topCompanies, setTopCompanies] = useState<CompanyLeader[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    // Fetch from cache first
    const { data: cached, error } = await supabase
      .from('leaderboard_cache')
      .select('*')
      .order('rank_by_profit', { ascending: true })
      .limit(20);

    if (!error && cached && cached.length > 0) {
      const entries = cached.map(e => ({
        id: e.id,
        user_id: e.user_id,
        user_name: e.user_name,
        total_profit: Number(e.total_profit),
        total_investments: e.total_investments || 0,
        total_trades: e.total_trades || 0,
        win_rate: Number(e.win_rate),
        rank_by_profit: e.rank_by_profit || 0,
        rank_by_volume: e.rank_by_volume || 0,
      }));

      setTopByProfit(entries.sort((a, b) => a.rank_by_profit - b.rank_by_profit).slice(0, 10));
      setTopByVolume(entries.sort((a, b) => a.rank_by_volume - b.rank_by_volume).slice(0, 10));
    }

    // Fetch top companies by investment volume
    const { data: companyData } = await supabase
      .from('investments')
      .select(`
        company_id,
        amount,
        final_profit_loss,
        companies (
          name,
          ticker
        )
      `)
      .eq('is_matured', true);

    if (companyData && companyData.length > 0) {
      // Group by company
      const companyStats: Record<string, {
        total: number;
        count: number;
        returns: number[];
        name: string;
        ticker: string;
      }> = {};

      companyData.forEach((inv) => {
        const cid = inv.company_id;
        if (!companyStats[cid]) {
          companyStats[cid] = {
            total: 0,
            count: 0,
            returns: [],
            name: inv.companies?.name || 'Unknown',
            ticker: inv.companies?.ticker || '???',
          };
        }
        companyStats[cid].total += Number(inv.amount);
        companyStats[cid].count += 1;
        if (inv.final_profit_loss !== null) {
          const returnPct = (Number(inv.final_profit_loss) / Number(inv.amount)) * 100;
          companyStats[cid].returns.push(returnPct);
        }
      });

      const leaders = Object.entries(companyStats).map(([id, stats]) => ({
        company_id: id,
        company_name: stats.name,
        company_ticker: stats.ticker,
        total_invested: stats.total,
        investor_count: stats.count,
        avg_return: stats.returns.length > 0
          ? stats.returns.reduce((a, b) => a + b, 0) / stats.returns.length
          : 0,
      })).sort((a, b) => b.total_invested - a.total_invested).slice(0, 10);

      setTopCompanies(leaders);
    }

    setLoading(false);
  }, []);

  // Update leaderboard cache
  const refreshLeaderboard = useCallback(async () => {
    await supabase.rpc('update_leaderboard_cache');
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard_cache' },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchLeaderboard]);

  return {
    topByProfit,
    topByVolume,
    topCompanies,
    loading,
    refreshLeaderboard,
  };
};
