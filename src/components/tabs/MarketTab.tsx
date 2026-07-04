import { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp, TrendingDown, ChevronRight, Building2, Flame,
  Activity, Shield, BarChart3, ArrowUpRight, ArrowDownRight,
  Zap, Star, Eye, Info, Target, Search, X, Sparkles, Gauge,
} from 'lucide-react';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { CPRChart } from '@/components/CPRChart';
import { cn } from '@/lib/utils';
import { sle, formatMarketCap } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { CompanyGlobalInvestments } from '@/components/CompanyGlobalInvestments';
import { MarketIndexChart } from '@/components/market/MarketIndexChart';
import { AnimatedNumber, Sparkline, seededSeries, hashSeed } from '@/components/market/parts';

/* ─── Types ─── */
interface CompanyDetailData {
  id: string; name: string; ticker: string; sector: string;
  risk_level: string; cpr_today: number; cpr_yesterday: number;
  cpr_7day_avg: number; cpr_30day_avg: number; cpr_best: number;
  cpr_worst: number; cpr_volatility: number; cpr_trend: string;
  current_price: number; is_silent_performer: boolean; description: string | null;
  is_trending?: boolean;
}

const riskColor = (r: string) => {
  const k = (r || '').toLowerCase();
  return k === 'low'    ? { c: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Low' } :
         k === 'medium' ? { c: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Med' } :
                          { c: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'High' };
};

const spark = (id: string, base: number) =>
  seededSeries(hashSeed(id), 18, base, Math.max(0.5, Math.abs(base) * 0.14) + 0.4);

const TrendBadge = ({ trend }: { trend: string }) => {
  const cfg =
    trend === 'improving' || trend === 'rising' ? { icon: ArrowUpRight, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Rising' } :
    trend === 'declining' || trend === 'falling' ? { icon: ArrowDownRight, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Falling' } :
                                                   { icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Stable' };
  const Icon = cfg.icon;
  return <span className="mt-trend-badge" style={{ color: cfg.color, background: cfg.bg }}><Icon className="w-3 h-3" />{cfg.label}</span>;
};

export const MarketTab = () => {
  const {
    companies: cprCompanies, positiveCompanies, negativeCompanies,
    stableCompanies, averageCPR, loading,
  } = useCPR();
  const { companies: fullCompanies } = useCompanies();

  const [selectedCompany, setSelectedCompany] = useState<CompanyDetailData | null>(null);
  const [cprHistory, setCprHistory] = useState<Array<{ recorded_date: string; cpr_value: number }>>([]);
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [moverTab, setMoverTab] = useState<'gainers' | 'losers' | 'active' | 'watched'>('gainers');
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'trending' | 'topGainers' | 'topLosers'>('trending');
  const [tick, setTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(0);

  /* Merge CPR + full company data */
  const companies = useMemo(() => cprCompanies.map((c) => {
    const f = fullCompanies.find((x) => x.id === c.id);
    return {
      ...c,
      price_change_percent: f ? f.price_change_percent : c.cpr_today,
      market_cap: f ? f.market_cap : 0,
    };
  }), [cprCompanies, fullCompanies]);

  /* "Last updated" timer + gentle live tick */
  useEffect(() => {
    const t = setInterval(() => { setLastUpdated((s) => s + 1); }, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { setLastUpdated(0); setTick((t) => t + 1); }, [averageCPR]);

  /* CPR history for detail drawer */
  useEffect(() => {
    if (!selectedCompany) return;
    (async () => {
      const { data } = await supabase
        .from('cpr_history')
        .select('recorded_date, cpr_value')
        .eq('company_id', selectedCompany.id)
        .order('recorded_date', { ascending: true })
        .limit(60);
      setCprHistory(data || []);
    })();
  }, [selectedCompany]);

  const handleCompanyClick = (companyId: string) => {
    const full = fullCompanies.find((c) => c.id === companyId);
    const cpr = cprCompanies.find((c) => c.id === companyId);
    if (full && cpr) {
      setSelectedCompany({
        id: full.id, name: full.name, ticker: full.ticker, sector: full.sector,
        risk_level: full.risk_level, cpr_today: cpr.cpr_today, cpr_yesterday: cpr.cpr_yesterday || 0,
        cpr_7day_avg: cpr.cpr_7day_avg, cpr_30day_avg: cpr.cpr_30day_avg || 0,
        cpr_best: cpr.cpr_best || 0, cpr_worst: cpr.cpr_worst || 0,
        cpr_volatility: cpr.cpr_volatility || 0, cpr_trend: cpr.cpr_trend || 'stable',
        current_price: full.current_price,
        is_silent_performer: (full as any).is_silent_performer || false,
        is_trending: full.is_trending, description: null,
      });
    }
  };

  /* ─── Derived market intelligence ─── */
  const isUp = averageCPR >= 0;
  const sentiment = averageCPR >= 3 ? 'Bullish' : averageCPR <= -3 ? 'Bearish' : 'Neutral';
  const sentColor = averageCPR >= 3 ? '#22c55e' : averageCPR <= -3 ? '#ef4444' : '#f59e0b';

  const totalCap = useMemo(() => companies.reduce((s, c) => s + (c.market_cap || 0), 0), [companies]);
  const gainers = useMemo(() => [...companies].sort((a, b) => b.cpr_today - a.cpr_today), [companies]);
  const losers = useMemo(() => [...companies].sort((a, b) => a.cpr_today - b.cpr_today), [companies]);
  const active = useMemo(() => [...companies].sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0)), [companies]);
  const watched = useMemo(() => [...companies].sort((a, b) => Number(b.is_trending) - Number(a.is_trending) || b.cpr_volatility - a.cpr_volatility), [companies]);
  const trending = useMemo(() => companies.filter((c) => c.is_trending), [companies]);

  const avgVol = companies.length ? companies.reduce((s, c) => s + c.cpr_volatility, 0) / companies.length : 0;
  const positivePct = companies.length ? (positiveCompanies.length / companies.length) * 100 : 50;
  const fearGreed = Math.max(2, Math.min(98, Math.round(50 + averageCPR * 2.2 + (positivePct - 50) * 0.6)));
  const fgLabel = fearGreed >= 75 ? 'Extreme Greed' : fearGreed >= 55 ? 'Greed' : fearGreed >= 45 ? 'Neutral' : fearGreed >= 25 ? 'Fear' : 'Extreme Fear';

  /* Sectors / categories */
  const sectors = useMemo(() => Array.from(new Set(companies.map((c) => c.sector))).filter(Boolean), [companies]);
  const sectorPerf = useMemo(() => sectors.map((s) => {
    const list = companies.filter((c) => c.sector === s);
    const avg = list.reduce((a, c) => a + c.cpr_today, 0) / (list.length || 1);
    return { sector: s, avg, count: list.length };
  }).sort((a, b) => b.avg - a.avg), [sectors, companies]);

  /* Filtered list (search + category) */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => {
      if (category !== 'All' && c.sector !== category) return false;
      if (q && !(c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [companies, category, query]);

  /* Overview stat cards */
  const overviewCards = [
    { key: 'bull', icon: TrendingUp, emoji: '📈', label: 'Bullish', value: positiveCompanies.length, color: '#22c55e', base: 2 },
    { key: 'bear', icon: TrendingDown, emoji: '📉', label: 'Bearish', value: negativeCompanies.length, color: '#ef4444', base: -2 },
    { key: 'active', icon: Flame, emoji: '🔥', label: 'Most Active', value: active[0]?.ticker, color: '#f97316', base: 3, raw: active[0]?.id },
    { key: 'gain', icon: ArrowUpRight, emoji: '⭐', label: 'Top Gainer', value: gainers[0] ? `+${gainers[0].cpr_today.toFixed(1)}%` : '—', color: '#22c55e', base: 4, raw: gainers[0]?.id },
    { key: 'loss', icon: ArrowDownRight, emoji: '⚠️', label: 'Biggest Loser', value: losers[0] ? `${losers[0].cpr_today.toFixed(1)}%` : '—', color: '#ef4444', base: -4, raw: losers[0]?.id },
    { key: 'avg', icon: Activity, emoji: '📊', label: 'Avg Growth', value: `${averageCPR >= 0 ? '+' : ''}${averageCPR.toFixed(1)}%`, color: isUp ? '#22c55e' : '#ef4444', base: averageCPR },
    { key: 'vol', icon: Zap, emoji: '⚡', label: 'Volatility', value: avgVol.toFixed(1), color: '#a855f7', base: 1.5 },
    { key: 'cap', icon: Building2, emoji: '💰', label: 'Market Cap', value: formatMarketCap(totalCap), color: '#3b82f6', base: 3 },
  ];

  /* AI Insights derived from real sector data */
  const aiInsights = useMemo(() => {
    const out: { text: string; conf: number; tone: 'up' | 'down' | 'flat' }[] = [];
    const top = sectorPerf[0];
    const bottom = sectorPerf[sectorPerf.length - 1];
    if (top) out.push({ text: `${top.sector} is outperforming the market, averaging ${top.avg >= 0 ? '+' : ''}${top.avg.toFixed(1)}% today.`, conf: Math.min(96, 62 + Math.abs(top.avg) * 3), tone: top.avg >= 0 ? 'up' : 'down' });
    if (bottom && bottom !== top) out.push({ text: `${bottom.sector} is under pressure at ${bottom.avg.toFixed(1)}%, dragging on overall sentiment.`, conf: Math.min(94, 60 + Math.abs(bottom.avg) * 3), tone: bottom.avg >= 0 ? 'up' : 'down' });
    if (gainers[0]) out.push({ text: `${gainers[0].name} is leading today's momentum with a ${gainers[0].cpr_today.toFixed(1)}% move.`, conf: Math.min(97, 70 + gainers[0].cpr_today), tone: 'up' });
    out.push({ text: `Market breadth is ${positivePct >= 55 ? 'strong' : positivePct >= 45 ? 'balanced' : 'weak'} — ${positiveCompanies.length} of ${companies.length} companies advancing.`, conf: 88, tone: positivePct >= 50 ? 'up' : 'down' });
    return out;
  }, [sectorPerf, gainers, positivePct, positiveCompanies.length, companies.length]);

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="mt-page"><div className="mt-body">
        <div className="mt-shimmer mt-sk-hero" />
        <div className="mt-shimmer mt-sk-chart" />
        <div className="mt-sk-row">{[...Array(3)].map((_, i) => <div key={i} className="mt-shimmer mt-sk-stat" />)}</div>
        {[...Array(4)].map((_, i) => <div key={i} className="mt-shimmer mt-sk-card" style={{ animationDelay: `${i * 60}ms` }} />)}
      </div></div>
    );
  }

  /* ─── Reusable company row ─── */
  const CompanyRow = ({ company, index, onTap }: { company: any; index: number; onTap: () => void }) => {
    const cprUp = company.cpr_today >= 0;
    const risk = riskColor(company.risk_level);
    return (
      <button className="mt-row" onClick={onTap}>
        <span className="mt-row-rank">{index + 1}</span>
        <div className="mt-row-logo"><span>{company.ticker?.slice(0, 2)}</span>{company.is_trending && <span className="mt-row-fire">🔥</span>}</div>
        <div className="mt-row-info">
          <p className="mt-row-name">{company.name}</p>
          <div className="mt-row-meta">
            <span>{company.ticker}</span><span className="mt-dot" /><span>{company.sector}</span>
            <span className="mt-risk-chip" style={{ color: risk.c, background: risk.bg }}>{risk.label}</span>
          </div>
        </div>
        <Sparkline data={spark(company.id, company.cpr_today)} color={cprUp ? '#22c55e' : '#ef4444'} width={48} height={22} />
        <div className="mt-row-cpr">
          <div className={cn('mt-row-cpr-main', cprUp ? 'mt-up' : 'mt-down')}>
            {cprUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {cprUp ? '+' : ''}{company.cpr_today?.toFixed(1)}%
          </div>
          <div className="mt-row-cap">{company.market_cap ? formatMarketCap(company.market_cap) : `7d ${company.cpr_7day_avg?.toFixed(1)}%`}</div>
        </div>
        <ChevronRight className="mt-row-chevron" />
      </button>
    );
  };

  const moverList = moverTab === 'gainers' ? gainers : moverTab === 'losers' ? losers : moverTab === 'active' ? active : watched;

  return (
    <div className="mt-page">
      {/* HEADER */}
      <header className="mt-header"><div className="mt-header-inner">
        <div>
          <div className="mt-live-pill" style={{ color: sentColor, background: `${sentColor}1f` }}>
            <span className="mt-live-dot" style={{ background: sentColor }} />LIVE MARKET
          </div>
          <h1 className="mt-header-title">Market</h1>
        </div>
        <div className={cn('mt-index-pill', isUp ? 'mt-up' : 'mt-down')}>
          {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <AnimatedNumber value={averageCPR} decimals={2} prefix={isUp ? '+' : ''} suffix="%" />
        </div>
      </div></header>

      {/* LIVE TICKER */}
      <div className="mt-ticker">
        <div className="mt-ticker-track">
          {[...active.slice(0, 14), ...active.slice(0, 14)].map((c, i) => {
            const u = c.cpr_today >= 0;
            return (
              <span key={i} className="mt-ticker-item" onClick={() => handleCompanyClick(c.id)}>
                <b>{c.ticker}</b>
                <span className={u ? 'mt-up' : 'mt-down'}>{u ? '▲' : '▼'}{Math.abs(c.cpr_today).toFixed(1)}%</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-body">
        {/* HERO */}
        <div className="mt-hero">
          <div className="mt-hero-glow" />
          <div className="mt-hero-top">
            <div>
              <p className="mt-hero-sent" style={{ color: sentColor }}>
                <span className="mt-live-dot" style={{ background: sentColor }} />{sentiment}
              </p>
              <div className={cn('mt-hero-big', isUp ? 'mt-up' : 'mt-down')}>
                <AnimatedNumber value={averageCPR} decimals={2} prefix={isUp ? '+' : ''} suffix="%" />
              </div>
              <p className="mt-hero-sub">CP Market Index · Daily Change</p>
            </div>
            <div className="mt-fg">
              <Gauge className="w-4 h-4" style={{ color: sentColor }} />
              <p className="mt-fg-val" style={{ color: sentColor }}><AnimatedNumber value={fearGreed} /></p>
              <p className="mt-fg-label">{fgLabel}</p>
            </div>
          </div>
          <div className="mt-hero-stats">
            <div className="mt-hero-stat"><p className="mt-hs-label">Health</p><p className="mt-hs-val">{Math.round(positivePct)}%</p></div>
            <div className="mt-hero-stat"><p className="mt-hs-label">Active</p><p className="mt-hs-val">{companies.length}</p></div>
            <div className="mt-hero-stat"><p className="mt-hs-label">Market Cap</p><p className="mt-hs-val">{formatMarketCap(totalCap)}</p></div>
            <div className="mt-hero-stat"><p className="mt-hs-label">Updated</p><p className="mt-hs-val">{lastUpdated}s ago</p></div>
          </div>
        </div>

        {/* INTERACTIVE CHART */}
        <div className="mt-chart-card">
          <div className="mt-card-title-row">
            <p className="mt-card-title"><BarChart3 className="w-4 h-4 text-primary" />Market Index</p>
            <span className={cn('mt-mini-badge', isUp ? 'mt-up-bg' : 'mt-down-bg')}>{isUp ? 'Uptrend' : 'Downtrend'}</span>
          </div>
          <MarketIndexChart averageCPR={averageCPR} seed={tick + 991} isUp={isUp} />
        </div>

        {/* SEARCH */}
        <div className="mt-search">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ticker, company or sector…" />
          {query && <button onClick={() => setQuery('')}><X className="w-4 h-4 text-muted-foreground" /></button>}
        </div>

        {/* CATEGORIES */}
        <div className="mt-chips">
          {['All', ...sectors].map((s) => (
            <button key={s} onClick={() => setCategory(s)} className={cn('mt-chip', category === s && 'mt-chip--on')}>{s}</button>
          ))}
        </div>

        {/* OVERVIEW CARDS */}
        <div className="mt-ov-grid">
          {overviewCards.map((c) => (
            <button key={c.key} className="mt-ov-card" onClick={() => c.raw && handleCompanyClick(c.raw)}>
              <div className="mt-ov-top">
                <span className="mt-ov-emoji">{c.emoji}</span>
                <span className="mt-ov-dot" style={{ background: c.color }} />
              </div>
              <p className="mt-ov-value" style={{ color: c.color }}>
                {typeof c.value === 'number' ? <AnimatedNumber value={c.value} /> : c.value}
              </p>
              <div className="mt-ov-bottom">
                <p className="mt-ov-label">{c.label}</p>
                <Sparkline data={spark(c.key, c.base)} color={c.color} width={42} height={18} />
              </div>
            </button>
          ))}
        </div>

        {/* AI INSIGHTS */}
        <div className="mt-section-head"><Sparkles className="w-4 h-4 text-primary" /><p>AI Market Insights</p></div>
        <div className="mt-ai-list">
          {aiInsights.map((ins, i) => (
            <div key={i} className="mt-ai-card">
              <div className={cn('mt-ai-icon', ins.tone === 'up' ? 'mt-up-bg' : ins.tone === 'down' ? 'mt-down-bg' : 'mt-flat-bg')}>
                {ins.tone === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : ins.tone === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="mt-ai-text">{ins.text}</p>
                <div className="mt-ai-conf"><div className="mt-ai-bar"><span style={{ width: `${ins.conf}%` }} /></div><span>{Math.round(ins.conf)}% confidence</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* TRENDING */}
        {trending.length > 0 && (
          <>
            <div className="mt-section-head"><Flame className="w-4 h-4" style={{ color: '#f97316' }} /><p>Trending Stocks</p>
              <button className="mt-see-all" onClick={() => { setDrawerTab('trending'); setShowDrawer(true); }}>See all <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-trend-track">
              {trending.slice(0, 8).map((co) => {
                const u = co.cpr_today >= 0; const risk = riskColor(co.risk_level);
                return (
                  <button key={co.id} className="mt-trend-card" onClick={() => handleCompanyClick(co.id)}>
                    <div className="mt-trend-top">
                      <div className="mt-trend-logo">{co.ticker.slice(0, 2)}</div>
                      <span className="mt-risk-chip" style={{ color: risk.c, background: risk.bg }}>{risk.label}</span>
                    </div>
                    <p className="mt-trend-name">{co.name}</p>
                    <p className="mt-trend-sector">{co.ticker} · {co.sector}</p>
                    <Sparkline data={spark(co.id, co.cpr_today)} color={u ? '#22c55e' : '#ef4444'} width={132} height={30} />
                    <div className="mt-trend-foot">
                      <span className="mt-trend-price">{sle(co.current_price, false)}</span>
                      <span className={cn('mt-trend-cpr', u ? 'mt-up' : 'mt-down')}>{u ? '+' : ''}{co.cpr_today.toFixed(1)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* SECTOR PERFORMANCE */}
        <div className="mt-section-head"><BarChart3 className="w-4 h-4 text-primary" /><p>Sector Performance</p></div>
        <div className="mt-sectors">
          {sectorPerf.map((s) => {
            const u = s.avg >= 0;
            const maxAbs = Math.max(...sectorPerf.map((x) => Math.abs(x.avg)), 1);
            const w = (Math.abs(s.avg) / maxAbs) * 100;
            return (
              <button key={s.sector} className="mt-sector-row" onClick={() => setCategory(s.sector)}>
                <span className="mt-sector-name">{s.sector}</span>
                <div className="mt-sector-track"><div className={cn('mt-sector-bar', u ? 'mt-up-fill' : 'mt-down-fill')} style={{ width: `${w}%` }} /></div>
                <span className={cn('mt-sector-val', u ? 'mt-up' : 'mt-down')}>{u ? '+' : ''}{s.avg.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>

        {/* MARKET MOVERS */}
        <div className="mt-section-head"><Zap className="w-4 h-4 text-primary" /><p>Market Movers</p></div>
        <div className="mt-mover-tabs">
          {([['gainers', 'Gainers'], ['losers', 'Losers'], ['active', 'Active'], ['watched', 'Watched']] as const).map(([k, l]) => (
            <button key={k} className={cn('mt-mover-tab', moverTab === k && 'mt-mover-tab--on')} onClick={() => setMoverTab(k)}>{l}</button>
          ))}
        </div>
        <div className="mt-mover-list">
          {moverList.slice(0, 5).map((co, i) => (
            <CompanyRow key={co.id} company={co} index={i} onTap={() => handleCompanyClick(co.id)} />
          ))}
        </div>

        {/* HEAT MAP */}
        <div className="mt-section-head"><Building2 className="w-4 h-4 text-primary" /><p>Market Heat Map</p></div>
        <div className="mt-heat">
          {active.slice(0, 12).map((co, i) => {
            const u = co.cpr_today >= 0;
            const intensity = Math.min(1, Math.abs(co.cpr_today) / 12);
            const bg = u ? `rgba(34,197,94,${0.18 + intensity * 0.55})` : `rgba(239,68,68,${0.18 + intensity * 0.55})`;
            const big = i < 3;
            return (
              <button key={co.id} className={cn('mt-heat-cell', big && 'mt-heat-cell--big')} style={{ background: bg }} onClick={() => handleCompanyClick(co.id)}>
                <span className="mt-heat-ticker">{co.ticker}</span>
                <span className="mt-heat-cpr">{u ? '+' : ''}{co.cpr_today.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>

        {/* ALL COMPANIES */}
        <div className="mt-section-head"><Building2 className="w-4 h-4 text-primary" /><p>{category === 'All' ? 'All Companies' : category}</p>
          <span className="mt-count">{filtered.length}</span>
        </div>
        {filtered.length > 0 ? (
          <div className="mt-mover-list">
            {filtered.map((co, i) => <CompanyRow key={co.id} company={co} index={i} onTap={() => handleCompanyClick(co.id)} />)}
          </div>
        ) : (
          <div className="mt-empty"><p className="text-3xl mb-2">🔍</p><p className="mt-empty-title">No matches</p>
            <button className="mt-empty-btn" onClick={() => { setQuery(''); setCategory('All'); }}>Reset</button>
          </div>
        )}
      </div>

      {/* TRENDING DRAWER */}
      <Drawer open={showDrawer} onOpenChange={(o) => { if (!o) setShowDrawer(false); }}>
        <DrawerContent className="max-h-[85dvh]">
          <div className="mt-drawer-tabs">
            {([['trending', '🔥 Trending'], ['topGainers', '📈 Gainers'], ['topLosers', '📉 Losers']] as const).map(([k, l]) => (
              <button key={k} className={cn('mt-dtab', drawerTab === k && 'mt-dtab--on')} onClick={() => setDrawerTab(k)}>{l}</button>
            ))}
          </div>
          <div className="mt-drawer-body">
            {(drawerTab === 'trending' ? trending : drawerTab === 'topGainers' ? gainers : losers).map((co, i) => (
              <CompanyRow key={co.id} company={co} index={i} onTap={() => { setShowDrawer(false); handleCompanyClick(co.id); }} />
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* DETAIL DRAWER */}
      <Drawer open={!!selectedCompany} onOpenChange={(o) => { if (!o) setSelectedCompany(null); }}>
        <DrawerContent className="max-h-[92dvh] p-0">
          {selectedCompany && (
            <>
              <div className="mt-detail-hero">
                <div className="mt-detail-hero-inner">
                  <div className="mt-detail-logo">{selectedCompany.ticker.slice(0, 2)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="mt-detail-name">{selectedCompany.name}</h2>
                      {selectedCompany.is_trending && <span className="text-base">🔥</span>}
                    </div>
                    <p className="mt-detail-sub">{selectedCompany.ticker} · {selectedCompany.sector}</p>
                  </div>
                </div>
                <div className="mt-detail-cpr-row">
                  <div>
                    <p className="mt-detail-cpr-label">Today's CPR</p>
                    <p className={cn('mt-detail-cpr-big', selectedCompany.cpr_today >= 0 ? 'mt-up' : 'mt-down')}>
                      {selectedCompany.cpr_today >= 0 ? '+' : ''}{selectedCompany.cpr_today.toFixed(2)}%
                    </p>
                  </div>
                  <div className="mt-detail-badges">
                    <TrendBadge trend={selectedCompany.cpr_trend} />
                    <span className="mt-detail-risk-badge" style={{ color: riskColor(selectedCompany.risk_level).c, background: riskColor(selectedCompany.risk_level).bg }}>
                      <Shield className="w-3 h-3" />{riskColor(selectedCompany.risk_level).label} Risk
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-detail-body">
                <div className="mt-detail-section"><CompanyGlobalInvestments companyId={selectedCompany.id} ticker={selectedCompany.ticker} /></div>
                {cprHistory.length > 0 && (
                  <div className="mt-detail-section">
                    <div className="mt-detail-section-header"><BarChart3 className="w-4 h-4 text-primary" /><p className="mt-detail-section-title">CPR History</p></div>
                    <div className="mt-detail-chart-wrap"><CPRChart data={cprHistory} height={140} showAxis /></div>
                  </div>
                )}
                <div className="mt-detail-section">
                  <div className="mt-detail-section-header"><Target className="w-4 h-4 text-primary" /><p className="mt-detail-section-title">CPR Performance</p></div>
                  <div className="mt-stats-grid">
                    {[
                      { label: 'Yesterday', val: selectedCompany.cpr_yesterday, isNum: true },
                      { label: '7-Day Avg', val: selectedCompany.cpr_7day_avg, isNum: true },
                      { label: '30-Day Avg', val: selectedCompany.cpr_30day_avg, isNum: true },
                      { label: 'Volatility', val: selectedCompany.cpr_volatility, isNum: false },
                    ].map((s) => (
                      <div key={s.label} className="mt-stat-tile">
                        <p className="mt-stat-label">{s.label}</p>
                        <p className={cn('mt-stat-val', s.isNum ? ((s.val as number) >= 0 ? 'mt-up' : 'mt-down') : 'text-foreground')}>
                          {s.isNum ? `${(s.val as number) >= 0 ? '+' : ''}${(s.val as number).toFixed(1)}%` : (s.val as number).toFixed(1)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-extremes-row">
                    <div className="mt-extreme mt-extreme--best"><span className="mt-extreme-label">🏆 Best</span><span className="mt-extreme-val mt-up">+{selectedCompany.cpr_best.toFixed(1)}%</span></div>
                    <div className="mt-extreme mt-extreme--worst"><span className="mt-extreme-label">⚠️ Worst</span><span className="mt-extreme-val mt-down">{selectedCompany.cpr_worst.toFixed(1)}%</span></div>
                  </div>
                </div>
                <div className="mt-detail-section">
                  <div className="mt-detail-section-header"><Info className="w-4 h-4 text-primary" /><p className="mt-detail-section-title">Company Info</p></div>
                  <div className="mt-info-row"><span className="mt-info-label">Current Price</span><span className="mt-info-val">{sle(selectedCompany.current_price)}</span></div>
                  <div className="mt-info-row"><span className="mt-info-label">Sector</span><span className="mt-info-val">{selectedCompany.sector}</span></div>
                  <div className="mt-info-row"><span className="mt-info-label">Risk Level</span><span className="mt-info-val" style={{ color: riskColor(selectedCompany.risk_level).c }}>{riskColor(selectedCompany.risk_level).label}</span></div>
                  <div className="mt-info-row"><span className="mt-info-label">CPR Trend</span><TrendBadge trend={selectedCompany.cpr_trend} /></div>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <style>{`
        .mt-page { min-height: 100vh; background: hsl(var(--background)); display: flex; flex-direction: column; }
        .mt-body { flex: 1; display: flex; flex-direction: column; gap: 18px; padding: 16px 16px 40px; }
        .mt-up { color: #22c55e; } .mt-down { color: #ef4444; }
        .mt-up-bg { color: #22c55e; background: rgba(34,197,94,0.12); }
        .mt-down-bg { color: #ef4444; background: rgba(239,68,68,0.12); }
        .mt-flat-bg { color: #f59e0b; background: rgba(245,158,11,0.12); }
        .mt-up-fill { background: linear-gradient(90deg,#16a34a,#22c55e); }
        .mt-down-fill { background: linear-gradient(90deg,#dc2626,#ef4444); }

        /* Header */
        .mt-header { position: sticky; top: 0; z-index: 40; background: hsl(var(--background)/0.9); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-bottom: 1px solid hsl(var(--border)/0.6); }
        .mt-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; max-width: 680px; margin: 0 auto; }
        .mt-header-title { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-top: 3px; }
        .mt-live-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 9999px; font-size: 10px; font-weight: 900; letter-spacing: 0.08em; }
        .mt-live-dot { width: 6px; height: 6px; border-radius: 9999px; animation: mtPulse 1.4s ease-in-out infinite; }
        @keyframes mtPulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.35;transform:scale(.7);} }
        .mt-index-pill { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; font-size: 15px; font-weight: 900; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }

        /* Ticker */
        .mt-ticker { overflow: hidden; border-bottom: 1px solid hsl(var(--border)/0.6); background: hsl(var(--card)/0.5); }
        .mt-ticker-track { display: inline-flex; gap: 22px; padding: 8px 0; white-space: nowrap; animation: mtTicker 40s linear infinite; will-change: transform; }
        @keyframes mtTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mt-ticker-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .mt-ticker-item b { color: hsl(var(--foreground)); }

        /* Hero */
        .mt-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 20px; background: linear-gradient(160deg, hsl(var(--card)), hsl(var(--muted)/0.4)); border: 1px solid hsl(var(--border)); box-shadow: var(--shadow-card); }
        .mt-hero-glow { position: absolute; top: -40%; right: -20%; width: 60%; height: 120%; background: radial-gradient(circle, hsl(var(--primary)/0.25), transparent 70%); filter: blur(30px); pointer-events: none; }
        .mt-hero-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; }
        .mt-hero-sent { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
        .mt-hero-big { font-size: 42px; font-weight: 900; letter-spacing: -1.5px; line-height: 1.05; margin: 4px 0; }
        .mt-hero-sub { font-size: 11px; color: hsl(var(--muted-foreground)); font-weight: 500; }
        .mt-fg { text-align: center; padding: 10px 14px; border-radius: 16px; background: hsl(var(--background)/0.5); border: 1px solid hsl(var(--border)); }
        .mt-fg-val { font-size: 26px; font-weight: 900; line-height: 1; margin-top: 2px; }
        .mt-fg-label { font-size: 9px; font-weight: 700; color: hsl(var(--muted-foreground)); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.04em; }
        .mt-hero-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-top: 18px; position: relative; }
        .mt-hero-stat { background: hsl(var(--background)/0.5); border: 1px solid hsl(var(--border)/0.6); border-radius: 14px; padding: 10px 8px; text-align: center; }
        .mt-hs-label { font-size: 9px; color: hsl(var(--muted-foreground)); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
        .mt-hs-val { font-size: 13px; font-weight: 900; margin-top: 3px; }

        /* Chart card */
        .mt-chart-card { border-radius: 22px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); padding: 16px; box-shadow: var(--shadow-card); }
        .mt-card-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .mt-card-title { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; }
        .mt-mini-badge { font-size: 10px; font-weight: 800; padding: 4px 9px; border-radius: 9999px; }

        /* Search */
        .mt-search { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }
        .mt-search input { flex: 1; background: none; border: none; outline: none; font-size: 14px; color: hsl(var(--foreground)); }
        .mt-search input::placeholder { color: hsl(var(--muted-foreground)); }

        /* Chips */
        .mt-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
        .mt-chips::-webkit-scrollbar { display: none; }
        .mt-chip { flex-shrink: 0; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 9999px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--muted-foreground)); cursor: pointer; transition: all .18s var(--ease-out); }
        .mt-chip--on { background: hsl(var(--primary)); border-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); box-shadow: 0 4px 12px -4px hsl(var(--primary)/0.6); }

        /* Overview grid */
        .mt-ov-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        .mt-ov-card { text-align: left; border-radius: 18px; padding: 14px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); cursor: pointer; transition: transform .15s var(--ease-out), box-shadow .15s var(--ease-out); }
        .mt-ov-card:active { transform: scale(0.97); }
        .mt-ov-top { display: flex; align-items: center; justify-content: space-between; }
        .mt-ov-emoji { font-size: 18px; }
        .mt-ov-dot { width: 8px; height: 8px; border-radius: 9999px; box-shadow: 0 0 8px currentColor; }
        .mt-ov-value { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin: 8px 0 2px; }
        .mt-ov-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; }
        .mt-ov-label { font-size: 11px; font-weight: 600; color: hsl(var(--muted-foreground)); }

        /* Section head */
        .mt-section-head { display: flex; align-items: center; gap: 8px; }
        .mt-section-head p { font-size: 15px; font-weight: 800; flex: 1; }
        .mt-see-all { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; }
        .mt-count { font-size: 12px; font-weight: 800; color: hsl(var(--muted-foreground)); background: hsl(var(--muted)); padding: 2px 9px; border-radius: 9999px; }

        /* AI */
        .mt-ai-list { display: flex; flex-direction: column; gap: 10px; margin-top: -6px; }
        .mt-ai-card { display: flex; gap: 12px; padding: 14px; border-radius: 16px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }
        .mt-ai-icon { width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mt-ai-text { font-size: 13px; font-weight: 600; line-height: 1.45; }
        .mt-ai-conf { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .mt-ai-bar { flex: 1; height: 4px; border-radius: 9999px; background: hsl(var(--muted)); overflow: hidden; }
        .mt-ai-bar span { display: block; height: 100%; border-radius: 9999px; background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow))); }
        .mt-ai-conf > span { font-size: 10px; font-weight: 700; color: hsl(var(--muted-foreground)); white-space: nowrap; }

        /* Trending */
        .mt-trend-track { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding: 2px 0 6px; margin-top: -6px; }
        .mt-trend-track::-webkit-scrollbar { display: none; }
        .mt-trend-card { flex-shrink: 0; width: 172px; text-align: left; border-radius: 20px; padding: 14px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); cursor: pointer; transition: transform .15s var(--ease-out); }
        .mt-trend-card:active { transform: scale(0.97); }
        .mt-trend-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .mt-trend-logo { width: 36px; height: 36px; border-radius: 11px; background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; }
        .mt-trend-name { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mt-trend-sector { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mt-trend-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .mt-trend-price { font-size: 12px; font-weight: 800; }
        .mt-trend-cpr { font-size: 13px; font-weight: 900; }

        /* Sectors */
        .mt-sectors { display: flex; flex-direction: column; gap: 4px; margin-top: -6px; }
        .mt-sector-row { display: flex; align-items: center; gap: 10px; padding: 9px 4px; background: none; border: none; cursor: pointer; }
        .mt-sector-name { width: 92px; text-align: left; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
        .mt-sector-track { flex: 1; height: 8px; border-radius: 9999px; background: hsl(var(--muted)); overflow: hidden; }
        .mt-sector-bar { height: 100%; border-radius: 9999px; transition: width .5s var(--ease-out); }
        .mt-sector-val { width: 54px; text-align: right; font-size: 12px; font-weight: 800; flex-shrink: 0; }

        /* Movers */
        .mt-mover-tabs { display: flex; gap: 6px; margin-top: -6px; }
        .mt-mover-tab { flex: 1; font-size: 12px; font-weight: 700; padding: 8px; border-radius: 12px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--muted-foreground)); cursor: pointer; transition: all .18s var(--ease-out); }
        .mt-mover-tab--on { background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary)/0.4); }
        .mt-mover-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

        /* Row */
        .mt-row { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 16px; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); cursor: pointer; text-align: left; transition: transform .15s var(--ease-out); }
        .mt-row:active { transform: scale(0.985); }
        .mt-row-rank { width: 20px; font-size: 12px; font-weight: 900; color: hsl(var(--muted-foreground)); text-align: center; flex-shrink: 0; }
        .mt-row-logo { position: relative; width: 40px; height: 40px; border-radius: 12px; background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; flex-shrink: 0; }
        .mt-row-fire { position: absolute; top: -6px; right: -6px; font-size: 12px; }
        .mt-row-info { flex: 1; min-width: 0; }
        .mt-row-name { font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mt-row-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; margin-top: 2px; }
        .mt-dot { width: 3px; height: 3px; border-radius: 9999px; background: hsl(var(--muted-foreground)); flex-shrink: 0; }
        .mt-risk-chip { font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; }
        .mt-row-cpr { text-align: right; flex-shrink: 0; }
        .mt-row-cpr-main { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 900; }
        .mt-row-cap { font-size: 9px; color: hsl(var(--muted-foreground)); font-weight: 600; margin-top: 2px; }
        .mt-row-chevron { width: 16px; height: 16px; color: hsl(var(--muted-foreground)); flex-shrink: 0; }

        /* Heat map */
        .mt-heat { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; grid-auto-rows: 62px; margin-top: -6px; }
        .mt-heat-cell { border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; border: 1px solid hsl(var(--border)/0.4); transition: transform .15s var(--ease-out); }
        .mt-heat-cell:active { transform: scale(0.95); }
        .mt-heat-cell--big { grid-column: span 1; grid-row: span 1; }
        .mt-heat-ticker { font-size: 13px; font-weight: 900; color: hsl(var(--foreground)); }
        .mt-heat-cpr { font-size: 11px; font-weight: 800; color: hsl(var(--foreground)/0.85); }

        /* Empty */
        .mt-empty { text-align: center; padding: 40px 20px; }
        .mt-empty-title { font-size: 15px; font-weight: 800; }
        .mt-empty-btn { margin-top: 12px; font-size: 13px; font-weight: 700; padding: 8px 20px; border-radius: 12px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); border: none; cursor: pointer; }

        /* Skeleton shimmer */
        .mt-shimmer { position: relative; overflow: hidden; background: hsl(var(--muted)); border-radius: 18px; }
        .mt-shimmer::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, hsl(var(--foreground)/0.06), transparent); transform: translateX(-100%); animation: mtShimmer 1.4s infinite; }
        @keyframes mtShimmer { 100% { transform: translateX(100%); } }
        .mt-sk-hero { height: 150px; } .mt-sk-chart { height: 220px; }
        .mt-sk-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; } .mt-sk-stat { height: 80px; }
        .mt-sk-card { height: 64px; }

        /* Drawers */
        .mt-drawer-tabs { display: flex; gap: 6px; padding: 12px 16px 0; }
        .mt-dtab { flex: 1; font-size: 12px; font-weight: 700; padding: 9px; border-radius: 12px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--muted-foreground)); cursor: pointer; }
        .mt-dtab--on { background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary)/0.4); }
        .mt-drawer-body { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px 28px; overflow-y: auto; }
        .mt-trend-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; }

        .mt-detail-hero { padding: 20px 16px 16px; background: linear-gradient(160deg, hsl(var(--primary)/0.12), hsl(var(--card))); border-bottom: 1px solid hsl(var(--border)); }
        .mt-detail-hero-inner { display: flex; align-items: center; gap: 12px; }
        .mt-detail-logo { width: 52px; height: 52px; border-radius: 16px; background: hsl(var(--primary)/0.15); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 900; flex-shrink: 0; }
        .mt-detail-name { font-size: 18px; font-weight: 900; }
        .mt-detail-sub { font-size: 12px; color: hsl(var(--muted-foreground)); font-weight: 600; }
        .mt-detail-cpr-row { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 16px; }
        .mt-detail-cpr-label { font-size: 11px; color: hsl(var(--muted-foreground)); font-weight: 600; }
        .mt-detail-cpr-big { font-size: 30px; font-weight: 900; letter-spacing: -0.5px; }
        .mt-detail-badges { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .mt-detail-risk-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 800; padding: 4px 9px; border-radius: 9999px; }
        .mt-detail-body { display: flex; flex-direction: column; gap: 18px; padding: 18px 16px 32px; overflow-y: auto; }
        .mt-detail-section-header { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
        .mt-detail-section-title { font-size: 13px; font-weight: 800; }
        .mt-detail-chart-wrap { border-radius: 16px; background: hsl(var(--muted)/0.3); padding: 8px; }
        .mt-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .mt-stat-tile { padding: 12px; border-radius: 14px; background: hsl(var(--muted)/0.4); }
        .mt-stat-label { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .mt-stat-val { font-size: 16px; font-weight: 900; }
        .mt-extremes-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .mt-extreme { padding: 12px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; }
        .mt-extreme--best { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); }
        .mt-extreme--worst { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
        .mt-extreme-label { font-size: 10px; font-weight: 700; color: hsl(var(--muted-foreground)); }
        .mt-extreme-val { font-size: 14px; font-weight: 900; }
        .mt-info-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid hsl(var(--border)/0.5); }
        .mt-info-row:last-child { border-bottom: none; }
        .mt-info-label { font-size: 12px; color: hsl(var(--muted-foreground)); font-weight: 500; }
        .mt-info-val { font-size: 12px; font-weight: 700; }

        @media (min-width: 640px) {
          .mt-body { max-width: 680px; margin: 0 auto; }
          .mt-ov-grid { grid-template-columns: repeat(4,1fr); }
          .mt-heat { grid-template-columns: repeat(4,1fr); }
          .mt-stats-grid { grid-template-columns: repeat(4,1fr); }
        }
      `}</style>
    </div>
  );
};
