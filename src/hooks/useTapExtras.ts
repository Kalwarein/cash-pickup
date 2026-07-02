import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export interface HistoryRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  amount_units: number;
  amount_sle: number;
  created_at: string;
}

export function useTapHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tap_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRows(((data as any[]) || []).map((r) => ({
      ...r,
      amount_units: Number(r.amount_units),
      amount_sle: Number(r.amount_sle),
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, refetch: load };
}

export function useTapAchievements() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('tap_achievements').select('achievement_key');
    setKeys(new Set(((data as any[]) || []).map((r) => r.achievement_key)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { keys, loading, refetch: load };
}