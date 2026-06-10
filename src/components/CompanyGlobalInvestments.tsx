import { useEffect, useState, useCallback } from 'react';
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Users, TrendingUp, Wallet, Trophy, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sle } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Props {
  companyId: string;
  ticker: string;
}

interface GlobalStats {
  total_invested: number;
  active_investors: number;
  total_investors: number;
  wins: number;
  losses: number;
  realized_profit: number;
}

interface WeekRow {
  week_start: string;
  total_invested: number;
  invest_count: number;
  realized_profit: number;
  realized_loss: number;
  wins: number;
  losses: number;
}

interface ChartPoint {
  label: string;
  cumulative: number;
  invested: number;
}

export const CompanyGlobalInvestments = ({ companyId, ticker }: Props) => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: statRows }, { data: weekRows }] = await Promise.all([
      supabase.rpc('get_company_global_stats', { p_company_id: companyId }),
      supabase.rpc('get_company_weekly_series', { p_company_id: companyId, p_limit: 26 }),
    ]);

    if (statRows && statRows[0]) {
      const s = statRows[0] as Record<string, number | string>;
      setStats({
        total_invested: Number(s.total_invested),
        active_investors: Number(s.active_investors),
        total_investors: Number(s.total_investors),
        wins: Number(s.wins),
        losses: Number(s.losses),
        realized_profit: Number(s.realized_profit),
      });
    }

    if (weekRows) {
      let running = 0;
      const points: ChartPoint[] = (weekRows as WeekRow[]).map((r) => {
        running += Number(r.realized_profit) - Number(r.realized_loss);
        return {
          label: new Date(r.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          cumulative: Math.round(running * 100) / 100,
          invested: Number(r.total_invested),
        };
      });
      setSeries(points);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // Live updates when new invest/claim events land in this company's weekly bucket
  useEffect(() => {
    const ch = supabase
      .channel(`gw_${companyId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'company_weekly_stats',
        filter: `company_id=eq.${companyId}`,
      }, () => { load(); })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [companyId, load]);

  const winRate = stats && (stats.wins + stats.losses) > 0
    ? (stats.wins / (stats.wins + stats.losses)) * 100
    : 0;
  const peak = series.length ? Math.max(...series.map(p => p.cumulative)) : 0;
  const positive = (stats?.realized_profit ?? 0) >= 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <div>
            <p className="font-semibold leading-none">Global Investments</p>
            <p className="text-[11px] text-muted-foreground mt-1">How everyone is investing in {ticker}</p>
          </div>
        </div>
        <div className={cn('text-sm font-bold px-2.5 py-1 rounded-lg tabular-nums',
          positive ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10')}>
          {positive ? '+' : ''}{sle(stats?.realized_profit ?? 0)}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-px bg-border/40">
        <Tile icon={Wallet} label="Total Invested" value={sle(stats?.total_invested ?? 0)} />
        <Tile icon={Users} label="Active Investors" value={String(stats?.active_investors ?? 0)} />
        <Tile icon={Trophy} label="Win / Loss" value={`${stats?.wins ?? 0} / ${stats?.losses ?? 0}`} sub={`${winRate.toFixed(0)}% win rate`} />
        <Tile icon={TrendingUp} label="Peak Profit" value={sle(peak)} />
      </div>

      {/* Cumulative step-up chart */}
      <div className="p-3">
        <p className="text-[11px] text-muted-foreground mb-2 px-1">
          Cumulative realized profit — steps up as investors lock in gains
        </p>
        <div className="h-[200px] w-full">
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3">
              <div className="relative w-9 h-9">
                <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">Loading activity…</p>
            </div>
          ) : series.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              No investment activity yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`giGrad_${companyId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false} width={38}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                  formatter={(val: number, name) => [
                    name === 'cumulative' ? sle(val) : sle(val),
                    name === 'cumulative' ? 'Cumulative profit' : 'Invested',
                  ]}
                />
                <Area type="stepAfter" dataKey="cumulative" stroke="#10b981" strokeWidth={2.5}
                  fill={`url(#giGrad_${companyId})`} dot={false} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, sub }: {
  icon: typeof Users; label: string; value: string; sub?: string;
}) => (
  <div className="bg-card p-3">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
    </div>
    <p className="text-base font-bold tabular-nums">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);
