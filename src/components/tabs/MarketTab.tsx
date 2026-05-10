import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, ChevronRight, Building2, Flame,
  Activity, Shield, X, BarChart3, ArrowUpRight, ArrowDownRight,
  Zap, Star, Eye, Info, Clock, Target
} from 'lucide-react';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { CPRIndicator } from '@/components/CPRIndicator';
import { CPRChart } from '@/components/CPRChart';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */
type FilterType = 'all' | 'positive' | 'negative' | 'stable';

interface CompanyDetailData {
  id: string; name: string; ticker: string; sector: string;
  risk_level: string; cpr_today: number; cpr_yesterday: number;
  cpr_7day_avg: number; cpr_30day_avg: number; cpr_best: number;
  cpr_worst: number; cpr_volatility: number; cpr_trend: string;
  current_price: number; is_silent_performer: boolean; description: string | null;
  is_trending?: boolean;
}

/* ─── Risk colour helper ─────────────────────────────────── */
const riskColor = (r: string) =>
  r === 'low'    ? { c: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Low Risk'    } :
  r === 'medium' ? { c: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Med Risk'    } :
                   { c: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'High Risk'   };

/* ─── Trend badge ────────────────────────────────────────── */
const TrendBadge = ({ trend }: { trend: string }) => {
  const cfg =
    trend === 'rising'   ? { icon: ArrowUpRight,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  label: 'Rising'   } :
    trend === 'falling'  ? { icon: ArrowDownRight,  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: 'Falling'  } :
                           { icon: Activity,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Stable'   };
  const Icon = cfg.icon;
  return (
    <span className="mt-trend-badge" style={{ color: cfg.color, background: cfg.bg }}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export const MarketTab = () => {
  /* ── Original hooks — UNTOUCHED ── */
  const {
    companies: cprCompanies, topPerformers, positiveCompanies,
    negativeCompanies, stableCompanies, averageCPR, loading,
  } = useCPR();
  const { companies: fullCompanies } = useCompanies();

  /* ── Original state ── */
  const [filter, setFilter]                   = useState<FilterType>('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetailData | null>(null);
  const [cprHistory, setCprHistory]           = useState<Array<{ recorded_date: string; cpr_value: number }>>([]);
  const [marketData, setMarketData]           = useState<Array<{ time: string; value: number }>>([]);

  /* ── New UI state ── */
  const [showTrendingDrawer, setShowTrendingDrawer] = useState(false);
  const [drawerTab, setDrawerTab]                   = useState<'trending' | 'topGainers' | 'topLosers'>('trending');

  /* ── Original market data logic — UNTOUCHED ── */
  useEffect(() => {
    const points: Array<{ time: string; value: number }> = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const base  = averageCPR * (1 - i / 30);
      const noise = (Math.random() - 0.5) * 4;
      points.push({ time: label, value: Math.round((base + noise) * 10) / 10 });
    }
    setMarketData(points);
  }, [averageCPR]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => {
        if (prev.length === 0) return prev;
        const last   = prev[prev.length - 1];
        const change = (Math.random() - 0.48) * 2;
        const newVal = Math.round((last.value + change) * 10) / 10;
        const label  = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return [...prev.slice(-29), { time: label, value: newVal }];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  /* ── Original CPR history fetch — UNTOUCHED ── */
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

  /* ── Original handleCompanyClick — UNTOUCHED ── */
  const handleCompanyClick = (companyId: string) => {
    const full = fullCompanies.find(c => c.id === companyId);
    const cpr  = cprCompanies.find(c => c.id === companyId);
    if (full && cpr) {
      setSelectedCompany({
        id: full.id, name: full.name, ticker: full.ticker,
        sector: full.sector, risk_level: full.risk_level,
        cpr_today: cpr.cpr_today, cpr_yesterday: cpr.cpr_yesterday || 0,
        cpr_7day_avg: cpr.cpr_7day_avg, cpr_30day_avg: cpr.cpr_30day_avg || 0,
        cpr_best: cpr.cpr_best || 0, cpr_worst: cpr.cpr_worst || 0,
        cpr_volatility: cpr.cpr_volatility || 0, cpr_trend: cpr.cpr_trend || 'stable',
        current_price: full.current_price,
        is_silent_performer: (full as any).is_silent_performer || false,
        is_trending: full.is_trending,
        description: null,
      });
    }
  };

  /* ── Original filter logic — UNTOUCHED ── */
  const getFilteredCompanies = () => {
    switch (filter) {
      case 'positive': return positiveCompanies;
      case 'negative': return negativeCompanies;
      case 'stable':   return stableCompanies;
      default:         return cprCompanies;
    }
  };
  const filteredCompanies = getFilteredCompanies();
  const trendingCompanies = cprCompanies.filter(c => c.is_trending);
  const latestValue       = marketData.length > 0 ? marketData[marketData.length - 1].value : 0;
  const isMarketUp        = latestValue >= 0;
  const topGainers        = [...cprCompanies].sort((a, b) => b.cpr_today - a.cpr_today).slice(0, 8);
  const topLosers         = [...cprCompanies].sort((a, b) => a.cpr_today - b.cpr_today).slice(0, 8);

  /* ── Market index summary cards ── */
  const marketCards = [
    { label: 'Positive',    val: positiveCompanies.length, icon: TrendingUp,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
    { label: 'Negative',    val: negativeCompanies.length, icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
    { label: 'Stable',      val: stableCompanies.length,  icon: Activity,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Trending',    val: trendingCompanies.length, icon: Flame,        color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  ];

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="mt-page">
        <div className="mt-body">
          <div className="mt-skel mt-skel--hero" />
          <div className="mt-skel mt-skel--row" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mt-skel mt-skel--card" style={{ animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     COMPANY ROW (reused in main list + trending drawer)
  ──────────────────────────────────────────────────────────── */
  const CompanyRow = ({ company, index, onTap }: { company: any; index: number; onTap: () => void }) => {
    const cprUp  = company.cpr_today >= 0;
    const risk   = riskColor(company.risk_level);
    return (
      <button className="mt-company-row" onClick={onTap}>
        {/* Rank */}
        <span className="mt-row-rank">#{index + 1}</span>

        {/* Logo */}
        <div className="mt-row-logo">
          <span className="mt-row-logo-text">{company.ticker?.slice(0, 2)}</span>
          {company.is_trending && <span className="mt-row-logo-fire">🔥</span>}
        </div>

        {/* Info */}
        <div className="mt-row-info">
          <div className="mt-row-name-line">
            <p className="mt-row-name">{company.name}</p>
            {/* Hidden gem badge intentionally removed — gems are indistinguishable */}
          </div>
          <div className="mt-row-meta">
            <span>{company.ticker}</span>
            <span className="mt-row-dot" />
            <span className="mt-row-sector">{company.sector}</span>
            <span className="mt-row-dot" />
            <span className="mt-risk-chip" style={{ color: risk.c, background: risk.bg }}>
              {risk.label}
            </span>
          </div>
        </div>

        {/* CPR */}
        <div className="mt-row-cpr">
          <div className={cn('mt-row-cpr-main', cprUp ? 'mt-up' : 'mt-down')}>
            {cprUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {cprUp ? '+' : ''}{company.cpr_today?.toFixed(1)}%
          </div>
          <div className="mt-row-7d">
            7d: {company.cpr_7day_avg >= 0 ? '+' : ''}{company.cpr_7day_avg?.toFixed(1)}%
          </div>
        </div>

        <ChevronRight className="mt-row-chevron" />
      </button>
    );
  };

  return (
    <div className="mt-page">

      {/* ═══════════════════════════════════════════
          STICKY HEADER
      ═══════════════════════════════════════════ */}
      <header className="mt-header">
        <div className="mt-header-inner">
          <div>
            <p className="mt-header-sub">Live · {cprCompanies.length} companies tracked</p>
            <h1 className="mt-header-title">Market</h1>
          </div>
          <div className="mt-header-right">
            <div className={cn('mt-live-pill', isMarketUp ? 'mt-live-up' : 'mt-live-down')}>
              <span className="mt-live-dot" />
              LIVE
            </div>
            <div className={cn('mt-index-pill', isMarketUp ? 'mt-up' : 'mt-down')}>
              {isMarketUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isMarketUp ? '+' : ''}{latestValue.toFixed(1)}%
            </div>
          </div>
        </div>
      </header>

      <div className="mt-body">

        {/* ═══════════════════════════════════════════
            MARKET INDEX CHART — full bleed card
        ═══════════════════════════════════════════ */}
        <div className="mt-chart-card">
          <span className="mt-chart-shimmer" />
          <div className="mt-chart-header">
            <div>
              <p className="mt-chart-label">CP Market Index</p>
              <div className={cn('mt-chart-value', isMarketUp ? 'mt-up' : 'mt-down')}>
                {isMarketUp ? '+' : ''}{latestValue.toFixed(2)}%
                <span className="mt-chart-live-dot" />
              </div>
            </div>
            <div className="mt-chart-avg">
              <p className="mt-chart-avg-label">Avg CPR</p>
              <p className={cn('mt-chart-avg-val', averageCPR >= 0 ? 'mt-up' : 'mt-down')}>
                {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={isMarketUp ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isMarketUp ? '#22c55e' : '#ef4444'} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                  formatter={(val: number) => [`${val >= 0 ? '+' : ''}${val.toFixed(1)}%`, 'Market']}
                />
                <Area
                  type="monotone" dataKey="value"
                  stroke={isMarketUp ? '#22c55e' : '#ef4444'} strokeWidth={2.5}
                  fill="url(#mtGrad)" dot={false} isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            MARKET SUMMARY CARDS — horizontal scroll
        ═══════════════════════════════════════════ */}
        <div className="mt-summary-track">
          {marketCards.map(({ label, val, icon: Icon, color, bg }) => (
            <div key={label} className="mt-summary-card">
              <div className="mt-summary-icon" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="mt-summary-val" style={{ color }}>{val}</p>
              <p className="mt-summary-label">{label}</p>
            </div>
          ))}
          {/* Hidden gems summary intentionally removed */}
        </div>

        {/* ═══════════════════════════════════════════
            TRENDING NOW — horizontal cards + See All
        ═══════════════════════════════════════════ */}
        {trendingCompanies.length > 0 && (
          <div>
            <div className="mt-section-header">
              <div className="mt-section-icon-wrap" style={{ background: 'rgba(249,115,22,0.1)' }}>
                <Flame className="w-4 h-4" style={{ color: '#f97316' }} />
              </div>
              <p className="mt-section-title">Trending Now</p>
              <button className="mt-see-all" onClick={() => { setDrawerTab('trending'); setShowTrendingDrawer(true); }}>
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-trending-track">
              {trendingCompanies.slice(0, 6).map(co => {
                const cprUp = co.cpr_today >= 0;
                const risk  = riskColor(co.risk_level);
                return (
                  <button
                    key={co.id}
                    className="mt-trending-card"
                    onClick={() => handleCompanyClick(co.id)}
                  >
                    <span className="mt-trending-shimmer" />
                    <div className="mt-trending-top">
                      <div className="mt-trending-logo">
                        <span className="mt-trending-ticker">{co.ticker.slice(0, 2)}</span>
                      </div>
                      <span className="text-base">🔥</span>
                    </div>
                    <p className="mt-trending-name">{co.name}</p>
                    <p className="mt-trending-sector">{co.sector}</p>
                    <div className={cn('mt-trending-cpr', cprUp ? 'mt-up' : 'mt-down')}>
                      {cprUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {cprUp ? '+' : ''}{co.cpr_today.toFixed(1)}%
                    </div>
                    <span className="mt-trending-risk" style={{ color: risk.c, background: risk.bg }}>
                      {risk.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TOP MOVERS — horizontal tabs row
        ═══════════════════════════════════════════ */}
        <div className="mt-movers-row">
          <button
            className="mt-mover-btn mt-mover-btn--up"
            onClick={() => { setDrawerTab('topGainers'); setShowTrendingDrawer(true); }}
          >
            <ArrowUpRight className="w-4 h-4" />
            <div>
              <p className="mt-mover-val">+{topGainers[0]?.cpr_today?.toFixed(1) ?? '0.0'}%</p>
              <p className="mt-mover-label">Top Gainer</p>
            </div>
            <p className="mt-mover-name">{topGainers[0]?.ticker}</p>
          </button>
          <button
            className="mt-mover-btn mt-mover-btn--down"
            onClick={() => { setDrawerTab('topLosers'); setShowTrendingDrawer(true); }}
          >
            <ArrowDownRight className="w-4 h-4" />
            <div>
              <p className="mt-mover-val">{topLosers[0]?.cpr_today?.toFixed(1) ?? '0.0'}%</p>
              <p className="mt-mover-label">Top Loser</p>
            </div>
            <p className="mt-mover-name">{topLosers[0]?.ticker}</p>
          </button>
          {/* Hidden gems mover button removed */}
        </div>

        {/* ═══════════════════════════════════════════
            FILTER PILLS
        ═══════════════════════════════════════════ */}
        <div className="mt-filter-row">
          {([
            { key: 'all',      label: 'All',         icon: Building2,  color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
            { key: 'positive', label: 'Positive',    icon: TrendingUp,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
            { key: 'negative', label: 'Negative',    icon: TrendingDown,color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
            { key: 'stable',   label: 'Stable',      icon: Activity,   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          ] as { key: FilterType; label: string; icon: any; color: string; bg: string }[]).map(({ key, label, icon: Icon, color, bg }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn('mt-filter-pill', filter === key && 'mt-filter-pill--on')}
              style={filter === key ? { background: color, borderColor: color, color: 'white' } : {}}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Count + sort label */}
        <div className="mt-list-header">
          <p className="mt-list-count">
            <span className="mt-list-count-num">{filteredCompanies.length}</span>
            {' '}compan{filteredCompanies.length === 1 ? 'y' : 'ies'}
          </p>
          <p className="mt-list-sort">Sorted by CPR · Today</p>
        </div>

        {/* ═══════════════════════════════════════════
            COMPANIES LIST
        ═══════════════════════════════════════════ */}
        {filteredCompanies.length > 0 ? (
          <div className="mt-company-list">
            {filteredCompanies.map((co, i) => (
              <CompanyRow
                key={co.id}
                company={co}
                index={i}
                onTap={() => handleCompanyClick(co.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-empty">
            <p className="text-3xl mb-3">📊</p>
            <p className="mt-empty-title">No companies</p>
            <p className="mt-empty-sub">Try a different filter</p>
            <button className="mt-empty-btn" onClick={() => setFilter('all')}>Show All</button>
          </div>
        )}

      </div>{/* end mt-body */}

      {/* ═══════════════════════════════════════════
          TRENDING / GAINERS / LOSERS DRAWER
      ═══════════════════════════════════════════ */}
      {showTrendingDrawer && (
        <div className="mt-overlay" onClick={() => setShowTrendingDrawer(false)}>
          <div className="mt-drawer" onClick={e => e.stopPropagation()}>
            <div className="mt-drawer-handle" />

            {/* Drawer tabs */}
            <div className="mt-drawer-tabs">
              {([
                { key: 'trending',   label: '🔥 Trending'     },
                { key: 'topGainers', label: '📈 Top Gainers'  },
                { key: 'topLosers',  label: '📉 Top Losers'   },
              ] as { key: typeof drawerTab; label: string }[]).map(t => (
                <button
                  key={t.key}
                  className={cn('mt-dtab', drawerTab === t.key && 'mt-dtab--on')}
                  onClick={() => setDrawerTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
              <button className="mt-drawer-close" onClick={() => setShowTrendingDrawer(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-drawer-body">
              {(
                drawerTab === 'trending'   ? trendingCompanies :
                drawerTab === 'topGainers' ? topGainers :
                topLosers
              ).map((co, i) => (
                <CompanyRow
                  key={co.id}
                  company={co}
                  index={i}
                  onTap={() => { setShowTrendingDrawer(false); handleCompanyClick(co.id); }}
                />
              ))}
              {(drawerTab === 'trending' && trendingCompanies.length === 0) && (
                <div className="mt-empty"><p>No trending companies right now</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          COMPANY DETAIL DRAWER
      ═══════════════════════════════════════════ */}
      {selectedCompany && (
        <div className="mt-overlay" onClick={() => setSelectedCompany(null)}>
          <div className="mt-detail-drawer" onClick={e => e.stopPropagation()}>
            <div className="mt-drawer-handle" />

            {/* Company hero */}
            <div className="mt-detail-hero">
              <span className="mt-detail-shimmer" />
              <div className="mt-detail-hero-inner">
                <div className="mt-detail-logo">
                  <span className="mt-detail-logo-text">{selectedCompany.ticker.slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="mt-detail-name">{selectedCompany.name}</h2>
                    {selectedCompany.is_trending && <span className="text-base">🔥</span>}
                  </div>
                  <p className="mt-detail-sub">{selectedCompany.ticker} · {selectedCompany.sector}</p>
                </div>
                <button className="mt-detail-close" onClick={() => setSelectedCompany(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hero CPR row */}
              <div className="mt-detail-cpr-row">
                <div>
                  <p className="mt-detail-cpr-label">Today's CPR</p>
                  <p className={cn('mt-detail-cpr-big', selectedCompany.cpr_today >= 0 ? 'mt-up' : 'mt-down')}>
                    {selectedCompany.cpr_today >= 0 ? '+' : ''}{selectedCompany.cpr_today.toFixed(2)}%
                  </p>
                </div>
                <div className="mt-detail-badges">
                  <TrendBadge trend={selectedCompany.cpr_trend} />
                  <span
                    className="mt-detail-risk-badge"
                    style={{
                      color: riskColor(selectedCompany.risk_level).c,
                      background: riskColor(selectedCompany.risk_level).bg,
                    }}
                  >
                    <Shield className="w-3 h-3" />
                    {riskColor(selectedCompany.risk_level).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="mt-detail-body">

              {/* CPR chart */}
              {cprHistory.length > 0 && (
                <div className="mt-detail-section">
                  <div className="mt-detail-section-header">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <p className="mt-detail-section-title">CPR History (60 days)</p>
                  </div>
                  <div className="mt-detail-chart-wrap">
                    <CPRChart data={cprHistory} height={140} showAxis />
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="mt-detail-section">
                <div className="mt-detail-section-header">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="mt-detail-section-title">CPR Performance</p>
                </div>
                <div className="mt-stats-grid">
                  {[
                    { label: 'Yesterday',   val: selectedCompany.cpr_yesterday,  isNum: true  },
                    { label: '7-Day Avg',   val: selectedCompany.cpr_7day_avg,   isNum: true  },
                    { label: '30-Day Avg',  val: selectedCompany.cpr_30day_avg,  isNum: true  },
                    { label: 'Volatility',  val: selectedCompany.cpr_volatility, isNum: false },
                  ].map(s => (
                    <div key={s.label} className="mt-stat-tile">
                      <p className="mt-stat-label">{s.label}</p>
                      <p className={cn('mt-stat-val', s.isNum
                        ? (s.val as number) >= 0 ? 'mt-up' : 'mt-down'
                        : 'text-foreground'
                      )}>
                        {s.isNum
                          ? `${(s.val as number) >= 0 ? '+' : ''}${(s.val as number).toFixed(1)}%`
                          : (s.val as number).toFixed(1)
                        }
                      </p>
                    </div>
                  ))}
                </div>

                {/* Best / worst */}
                <div className="mt-extremes-row">
                  <div className="mt-extreme mt-extreme--best">
                    <span className="mt-extreme-label">🏆 Best CPR</span>
                    <span className="mt-extreme-val mt-up">+{selectedCompany.cpr_best.toFixed(1)}%</span>
                  </div>
                  <div className="mt-extreme mt-extreme--worst">
                    <span className="mt-extreme-label">⚠️ Worst CPR</span>
                    <span className="mt-extreme-val mt-down">{selectedCompany.cpr_worst.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Company info */}
              <div className="mt-detail-section">
                <div className="mt-detail-section-header">
                  <Info className="w-4 h-4 text-primary" />
                  <p className="mt-detail-section-title">Company Info</p>
                </div>
                <div className="mt-info-row">
                  <span className="mt-info-label">Current Price</span>
                  <span className="mt-info-val">{sle(selectedCompany.current_price)}</span>
                </div>
                <div className="mt-info-row">
                  <span className="mt-info-label">Sector</span>
                  <span className="mt-info-val">{selectedCompany.sector}</span>
                </div>
                <div className="mt-info-row">
                  <span className="mt-info-label">Risk Level</span>
                  <span className="mt-info-val" style={{ color: riskColor(selectedCompany.risk_level).c }}>
                    {riskColor(selectedCompany.risk_level).label}
                  </span>
                </div>
                <div className="mt-info-row">
                  <span className="mt-info-label">CPR Trend</span>
                  <TrendBadge trend={selectedCompany.cpr_trend} />
                </div>
              </div>

              {/* Hidden gem notice removed — keep gems anonymous */}

            </div>{/* end mt-detail-body */}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ALL STYLES
      ═══════════════════════════════════════════ */}
      <style>{`
        /* ── Layout ── */
        .mt-page { min-height: 100vh; background: hsl(var(--background)); display: flex; flex-direction: column; }
        .mt-body { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 14px 16px 32px; }

        /* ── Header ── */
        .mt-header {
          position: sticky; top: 0; z-index: 40;
          background: hsl(var(--background)/0.97);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid hsl(var(--border));
        }
        .mt-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; }
        .mt-header-sub   { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }
        .mt-header-title { font-size: 22px; font-weight: 900; color: hsl(var(--foreground)); letter-spacing: -0.4px; line-height: 1.15; }
        .mt-header-right { display: flex; align-items: center; gap: 7px; }
        .mt-live-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 9999px; font-size: 10px; font-weight: 900; letter-spacing: 0.08em;
        }
        .mt-live-up   { background: rgba(34,197,94,0.12);  color: #22c55e; }
        .mt-live-down { background: rgba(239,68,68,0.12); color: #ef4444; }
        .mt-live-dot  { width: 6px; height: 6px; border-radius: 9999px; background: currentColor; animation: mtPulse 1.5s ease-in-out infinite; }
        @keyframes mtPulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .mt-index-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 5px 10px; border-radius: 9999px; font-size: 12px; font-weight: 800;
          background: hsl(var(--card)); border: 1px solid hsl(var(--border));
        }

        /* Colour helpers */
        .mt-up   { color: #22c55e; }
        .mt-down { color: #ef4444; }

        /* ── Chart card ── */
        .mt-chart-card {
          position: relative; overflow: hidden; border-radius: 22px;
          background: hsl(var(--card)); border: 1px solid hsl(var(--border));
          padding: 18px 16px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.07);
        }
        .mt-chart-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.05) 50%, transparent 80%);
          background-size: 200% 100%; animation: mtShimmer 5s ease-in-out infinite;
        }
        @keyframes mtShimmer {
          0%        { background-position: 200% 0; opacity: 0; }
          10%       { opacity: 1; }
          50%       { background-position: -200% 0; }
          60%,100%  { opacity: 0; }
        }
        .mt-chart-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .mt-chart-label  { font-size: 11px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .mt-chart-value  { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
        .mt-chart-live-dot { width: 8px; height: 8px; border-radius: 9999px; background: #22c55e; animation: mtPulse 1.5s ease-in-out infinite; display: inline-block; }
        .mt-chart-avg { text-align: right; }
        .mt-chart-avg-label { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; }
        .mt-chart-avg-val   { font-size: 15px; font-weight: 800; margin-top: 2px; }
        .mt-chart-area { height: 120px; margin: 0 -4px; }

        /* ── Summary cards — horizontal scroll ── */
        .mt-summary-track { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
        .mt-summary-track::-webkit-scrollbar { display: none; }
        .mt-summary-card {
          flex-shrink: 0; min-width: 80px; padding: 14px 12px;
          border-radius: 18px; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); display: flex; flex-direction: column; align-items: center; gap: 5px;
        }
        .mt-summary-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .mt-summary-val  { font-size: 18px; font-weight: 900; line-height: 1; }
        .mt-summary-label { font-size: 10px; font-weight: 600; color: hsl(var(--muted-foreground)); text-align: center; }

        /* ── Section header ── */
        .mt-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .mt-section-icon-wrap { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .mt-section-title { font-size: 14px; font-weight: 800; color: hsl(var(--foreground)); flex: 1; }
        .mt-see-all { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; padding: 4px; }

        /* ── Trending cards — horizontal ── */
        .mt-trending-track { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding: 2px 0 4px; }
        .mt-trending-track::-webkit-scrollbar { display: none; }
        .mt-trending-card {
          position: relative; overflow: hidden; flex-shrink: 0;
          width: 148px; border-radius: 20px; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); padding: 13px;
          display: flex; flex-direction: column; gap: 4px;
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.17s ease;
          text-align: left;
        }
        .mt-trending-card:active { transform: scale(0.95); }
        .mt-trending-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%);
          background-size: 200% 100%; animation: mtShimmer 3.5s ease-in-out infinite;
        }
        .mt-trending-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .mt-trending-logo { width: 38px; height: 38px; border-radius: 11px; background: hsl(var(--primary)/0.12); display: flex; align-items: center; justify-content: center; }
        .mt-trending-ticker { font-size: 12px; font-weight: 900; color: hsl(var(--primary)); }
        .mt-trending-name   { font-size: 12px; font-weight: 700; color: hsl(var(--foreground)); line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mt-trending-sector { font-size: 10px; color: hsl(var(--muted-foreground)); }
        .mt-trending-cpr    { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 800; margin-top: 4px; }
        .mt-trending-risk   { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; margin-top: 2px; align-self: flex-start; }

        /* ── Movers row ── */
        .mt-movers-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .mt-mover-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 13px 8px; border-radius: 16px; border: 1.5px solid;
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: transform 0.15s;
          background: hsl(var(--card));
        }
        .mt-mover-btn:active { transform: scale(0.94); }
        .mt-mover-btn--up   { border-color: rgba(34,197,94,0.3);  color: #22c55e; }
        .mt-mover-btn--down { border-color: rgba(239,68,68,0.3);  color: #ef4444; }
        .mt-mover-btn--gem  { border-color: rgba(139,92,246,0.3); color: #8b5cf6; }
        .mt-mover-val   { font-size: 14px; font-weight: 900; line-height: 1.1; }
        .mt-mover-label { font-size: 9px; font-weight: 600; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.05em; }
        .mt-mover-name  { font-size: 10px; font-weight: 800; color: hsl(var(--muted-foreground)); }

        /* ── Filter pills ── */
        .mt-filter-row { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
        .mt-filter-row::-webkit-scrollbar { display: none; }
        .mt-filter-pill {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          padding: 7px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--foreground));
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s;
          white-space: nowrap;
        }
        .mt-filter-pill--on { font-weight: 800; }

        /* ── List header ── */
        .mt-list-header { display: flex; align-items: center; justify-content: space-between; }
        .mt-list-count  { font-size: 12px; color: hsl(var(--muted-foreground)); }
        .mt-list-count-num { font-size: 15px; font-weight: 900; color: hsl(var(--foreground)); }
        .mt-list-sort   { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; }

        /* ── Company row ── */
        .mt-company-list { display: flex; flex-direction: column; gap: 8px; }
        .mt-company-row {
          width: 100%; display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 18px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent; text-align: left;
          transition: all 0.15s;
        }
        .mt-company-row:active { transform: scale(0.98); background: hsl(var(--muted)/0.4); }
        .mt-row-rank { font-size: 10px; font-weight: 800; color: hsl(var(--muted-foreground)); min-width: 20px; flex-shrink: 0; }
        .mt-row-logo {
          position: relative; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          background: hsl(var(--primary)/0.1);
          display: flex; align-items: center; justify-content: center;
        }
        .mt-row-logo-text { font-size: 13px; font-weight: 900; color: hsl(var(--primary)); }
        .mt-row-logo-fire { position: absolute; top: -4px; right: -4px; font-size: 11px; }
        .mt-row-info { flex: 1; min-width: 0; }
        .mt-row-name-line { display: flex; align-items: center; gap: 5px; }
        .mt-row-name { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .mt-row-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; font-size: 10px; color: hsl(var(--muted-foreground)); flex-wrap: wrap; }
        .mt-row-dot { width: 3px; height: 3px; border-radius: 9999px; background: hsl(var(--muted-foreground)); }
        .mt-row-sector { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
        .mt-risk-chip { padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; }
        .mt-silent-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 9999px; font-size: 9px; font-weight: 700; background: hsl(var(--primary)/0.1); color: hsl(var(--primary)); flex-shrink: 0; }
        .mt-row-cpr { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .mt-row-cpr-main { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 800; }
        .mt-row-7d { font-size: 9px; color: hsl(var(--muted-foreground)); font-weight: 600; }
        .mt-row-chevron { width: 14px; height: 14px; color: hsl(var(--muted-foreground)); flex-shrink: 0; }

        /* Trend badge */
        .mt-trend-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }

        /* Empty */
        .mt-empty { text-align: center; padding: 32px 16px; }
        .mt-empty-title { font-size: 15px; font-weight: 800; color: hsl(var(--foreground)); margin-bottom: 4px; }
        .mt-empty-sub   { font-size: 12px; color: hsl(var(--muted-foreground)); margin-bottom: 14px; }
        .mt-empty-btn   { display: inline-flex; padding: 9px 20px; border-radius: 12px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-size: 13px; font-weight: 700; border: none; cursor: pointer; }

        /* Skeletons */
        .mt-skel { border-radius: 18px; background: hsl(var(--muted)); animation: mtSkelPulse 1.4s ease-in-out infinite; }
        .mt-skel--hero { height: 180px; }
        .mt-skel--row  { height: 56px; }
        .mt-skel--card { height: 76px; }
        @keyframes mtSkelPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

        /* ── Overlay ── */
        .mt-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
          display: flex; align-items: flex-end;
          animation: mtFade 0.18s ease;
        }
        @keyframes mtFade { from{opacity:0;} to{opacity:1;} }

        /* ── Trending / List drawer ── */
        .mt-drawer {
          width: 100%; max-height: 85vh; overflow: hidden;
          background: hsl(var(--card)); border-radius: 28px 28px 0 0;
          border-top: 1px solid hsl(var(--border));
          display: flex; flex-direction: column;
          animation: mtSlide 0.25s cubic-bezier(0.34,1.15,0.64,1);
        }
        @keyframes mtSlide { from{transform:translateY(100%);} to{transform:translateY(0);} }
        .mt-drawer-handle { width: 40px; height: 4px; border-radius: 9999px; background: hsl(var(--muted)); margin: 10px auto 0; flex-shrink: 0; }
        .mt-drawer-tabs {
          display: flex; align-items: center; gap: 6px; padding: 12px 16px 10px;
          border-bottom: 1px solid hsl(var(--border)); overflow-x: auto; flex-shrink: 0;
          scrollbar-width: none;
        }
        .mt-drawer-tabs::-webkit-scrollbar { display: none; }
        .mt-dtab {
          display: inline-flex; align-items: center; padding: 7px 14px; border-radius: 9999px;
          font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--foreground));
          cursor: pointer; transition: all 0.15s; -webkit-tap-highlight-color: transparent;
        }
        .mt-dtab--on { background: hsl(var(--primary)); border-color: hsl(var(--primary)); color: hsl(var(--primary-foreground)); font-weight: 700; }
        .mt-drawer-close {
          margin-left: auto; flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--foreground));
        }
        .mt-drawer-body { flex: 1; overflow-y: auto; padding: 12px 16px 24px; display: flex; flex-direction: column; gap: 8px; }

        /* ── Company detail drawer ── */
        .mt-detail-drawer {
          width: 100%; max-height: 92vh; overflow: hidden;
          background: hsl(var(--card)); border-radius: 28px 28px 0 0;
          border-top: 1px solid hsl(var(--border));
          display: flex; flex-direction: column;
          animation: mtSlide 0.28s cubic-bezier(0.34,1.1,0.64,1);
        }
        .mt-detail-hero {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%);
          padding: 8px 18px 18px; flex-shrink: 0;
        }
        .mt-detail-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.1) 54%, transparent 80%);
          background-size: 200% 100%; animation: mtShimmer 4s ease-in-out infinite;
        }
        .mt-detail-hero-inner { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .mt-detail-logo { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mt-detail-logo-text { font-size: 16px; font-weight: 900; color: white; }
        .mt-detail-name { font-size: 18px; font-weight: 900; color: white; line-height: 1.2; }
        .mt-detail-sub  { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px; }
        .mt-detail-close {
          margin-left: auto; flex-shrink: 0; width: 32px; height: 32px; border-radius: 10px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: white; position: relative; z-index: 2;
        }
        .mt-detail-cpr-row { position: relative; z-index: 1; display: flex; align-items: flex-end; justify-content: space-between; }
        .mt-detail-cpr-label { font-size: 10px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .mt-detail-cpr-big   { font-size: 32px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
        .mt-detail-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .mt-detail-risk-badge { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }

        /* Detail body */
        .mt-detail-body { flex: 1; overflow-y: auto; padding: 16px 18px 28px; display: flex; flex-direction: column; gap: 16px; }
        .mt-detail-section { background: hsl(var(--background)); border-radius: 18px; padding: 14px; border: 1px solid hsl(var(--border)); }
        .mt-detail-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .mt-detail-section-title  { font-size: 13px; font-weight: 800; color: hsl(var(--foreground)); }
        .mt-detail-chart-wrap { border-radius: 12px; overflow: hidden; }

        /* Stats grid */
        .mt-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .mt-stat-tile  { padding: 12px; border-radius: 14px; background: hsl(var(--muted)/0.4); }
        .mt-stat-label { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .mt-stat-val   { font-size: 16px; font-weight: 900; }

        /* Extremes */
        .mt-extremes-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .mt-extreme { padding: 12px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; }
        .mt-extreme--best  { background: rgba(34,197,94,0.08);  border: 1px solid rgba(34,197,94,0.2);  }
        .mt-extreme--worst { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.2);  }
        .mt-extreme-label { font-size: 10px; font-weight: 700; color: hsl(var(--muted-foreground)); }
        .mt-extreme-val   { font-size: 14px; font-weight: 900; }

        /* Info rows */
        .mt-info-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid hsl(var(--border)/0.5); }
        .mt-info-row:last-child { border-bottom: none; }
        .mt-info-label { font-size: 12px; color: hsl(var(--muted-foreground)); font-weight: 500; }
        .mt-info-val   { font-size: 12px; font-weight: 700; color: hsl(var(--foreground)); }

        /* Gem notice */
        .mt-gem-notice {
          display: flex; align-items: flex-start; gap: 10px; padding: 14px;
          border-radius: 16px; background: hsl(var(--primary)/0.07);
          border: 1px solid hsl(var(--primary)/0.2);
          font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.6;
        }

        /* @media wider screens */
        @media (min-width: 640px) {
          .mt-body { max-width: 680px; margin: 0 auto; padding: 16px 24px 32px; }
          .mt-header-inner { max-width: 680px; margin: 0 auto; padding: 12px 24px; }
          .mt-movers-row { grid-template-columns: repeat(3,1fr); }
          .mt-stats-grid { grid-template-columns: repeat(4,1fr); }
          .mt-extremes-row { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};
