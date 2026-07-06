import { useMemo } from 'react';
import { SubPage } from '@/components/wallet/SubPage';
import { Money } from '@/components/wallet/Money';
import { useInvestments } from '@/hooks/useInvestments';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Trophy, AlertTriangle, Target, Percent } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4'];

const Analytics = () => {
  const { investments, completedInvestments } = useInvestments();

  const data = useMemo(() => {
    const completed = completedInvestments;
    const lifetime = completed.reduce((s, i) => s + (i.final_profit_loss || 0), 0);
    const wins = completed.filter(i => (i.final_profit_loss || 0) > 0);
    const losses = completed.filter(i => (i.final_profit_loss || 0) < 0);
    const winRate = completed.length ? (wins.length / completed.length) * 100 : 0;
    const totalInvested = completed.reduce((s, i) => s + i.amount, 0);
    const avgReturn = totalInvested ? (lifetime / totalInvested) * 100 : 0;
    const best = [...completed].sort((a, b) => (b.final_profit_loss || 0) - (a.final_profit_loss || 0))[0];
    const worst = [...completed].sort((a, b) => (a.final_profit_loss || 0) - (b.final_profit_loss || 0))[0];

    // Cumulative growth timeline
    let cum = 0;
    const timeline = [...completed]
      .sort((a, b) => +new Date(a.claimed_at || a.created_at) - +new Date(b.claimed_at || b.created_at))
      .map((i, idx) => { cum += (i.final_profit_loss || 0); return { name: `#${idx + 1}`, value: Math.round(cum) }; });
    if (timeline.length === 0) timeline.push({ name: 'Start', value: 0 });

    // Allocation by company (active)
    const alloc: Record<string, number> = {};
    investments.forEach(i => { alloc[i.company_name || 'Other'] = (alloc[i.company_name || 'Other'] || 0) + i.amount; });
    const allocation = Object.entries(alloc).map(([name, value]) => ({ name, value })).slice(0, 6);

    // Monthly profit
    const monthly: Record<string, number> = {};
    completed.forEach(i => {
      const d = new Date(i.claimed_at || i.created_at);
      const key = d.toLocaleString('en-US', { month: 'short' });
      monthly[key] = (monthly[key] || 0) + (i.final_profit_loss || 0);
    });
    const monthlyProfit = Object.values(monthly).reduce((s, v) => s + v, 0);

    return { lifetime, wins: wins.length, losses: losses.length, winRate, avgReturn, best, worst, timeline, allocation, monthlyProfit };
  }, [investments, completedInvestments]);

  const kpis = [
    { label: 'Lifetime Profit', value: data.lifetime, icon: TrendingUp, pl: true },
    { label: 'Monthly Profit', value: data.monthlyProfit, icon: Percent, pl: true },
    { label: 'Avg Return', value: data.avgReturn, icon: Target, pct: true, pl: true },
    { label: 'Win Rate', value: data.winRate, icon: Trophy, pct: true },
  ];

  return (
    <SubPage title="Performance Analytics" subtitle="Your portfolio insights">
      <div className="grid grid-cols-2 gap-2.5">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <k.icon className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">{k.label}</span>
            </div>
            {k.pct
              ? <span className={cn('text-lg font-bold tabular-nums', k.pl && k.value > 0 && 'text-success', k.pl && k.value < 0 && 'text-destructive')}>{k.value.toFixed(1)}%</span>
              : <Money value={k.value} showSign={k.pl} className={cn('text-lg font-bold', k.pl && k.value > 0 && 'text-success', k.pl && k.value < 0 && 'text-destructive')} />}
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3">Portfolio Growth</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data.timeline} margin={{ left: -20, right: 6, top: 6 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data.allocation.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-semibold text-sm mb-3">Portfolio Allocation</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={150}>
              <PieChart>
                <Pie data={data.allocation} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                  {data.allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {data.allocation.map((a, i) => (
                <div key={a.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate">{a.name}</span>
                  <Money value={a.value} suffix={false} decimals={0} className="font-medium" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass-card p-4">
          <Trophy className="w-5 h-5 text-success mb-2" />
          <p className="text-[10px] text-muted-foreground">Best Investment</p>
          <p className="text-sm font-semibold truncate">{data.best?.company_name || '—'}</p>
          {data.best && <Money value={data.best.final_profit_loss || 0} showSign className="text-sm font-bold text-success" />}
        </div>
        <div className="glass-card p-4">
          <AlertTriangle className="w-5 h-5 text-destructive mb-2" />
          <p className="text-[10px] text-muted-foreground">Worst Investment</p>
          <p className="text-sm font-semibold truncate">{data.worst?.company_name || '—'}</p>
          {data.worst && <Money value={data.worst.final_profit_loss || 0} showSign className="text-sm font-bold text-destructive" />}
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-semibold text-sm mb-3">Win / Loss Ratio</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              <div className="bg-success" style={{ width: `${data.wins + data.losses ? (data.wins / (data.wins + data.losses)) * 100 : 50}%` }} />
              <div className="bg-destructive flex-1" />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="flex items-center gap-1 text-success"><TrendingUp className="w-3.5 h-3.5" /> {data.wins} wins</span>
              <span className="flex items-center gap-1 text-destructive">{data.losses} losses <TrendingDown className="w-3.5 h-3.5" /></span>
            </div>
          </div>
        </div>
      </div>
    </SubPage>
  );
};

export default Analytics;
