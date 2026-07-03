import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderRow {
  user_id: string;
  user_name: string;
  total_units: number;
  lifetime_taps: number;
  leverage_level: number;
  rank: number;
}

export type LeaderMetric = 'units' | 'taps' | 'leverage';

export function useTapLeaderboard(metric: LeaderMetric) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .rpc('get_tap_leaderboard', { p_metric: metric, p_limit: 50 })
      .then(({ data }) => {
        if (!active) return;
        setRows(((data as any[]) || []).map((r) => ({
          user_id: r.user_id,
          user_name: r.user_name,
          total_units: Number(r.total_units),
          lifetime_taps: Number(r.lifetime_taps),
          leverage_level: Number(r.leverage_level),
          rank: Number(r.rank),
        })));
        setLoading(false);
      });
    return () => { active = false; };
  }, [metric]);

  return { rows, loading };
}