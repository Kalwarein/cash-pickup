import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, X, ChevronRight,
  TrendingUp, Flame, Shield, AlertTriangle,
  ArrowUpRight, ArrowDownRight, BarChart3,
  Check, Info, LayoutGrid, LayoutList,
  Building2, Leaf, Cpu, Landmark, Lightbulb, Home,
  Radio, Plane, Ship, HeartPulse, HardHat, Factory,
  GraduationCap, Eye
} from 'lucide-react';
import { CompanyCard } from '@/components/CompanyCard';
import { ListSkeleton } from '@/components/skeletons/CardSkeletons';
import { CompanyDetail } from '@/components/CompanyDetail';
import { InvestModal } from '@/components/InvestModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

/* ─── Sector config ── */
const SECTOR_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Mining':        { icon: HardHat,       color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Agriculture':   { icon: Leaf,          color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  'Technology':    { icon: Cpu,           color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  'Finance':       { icon: Landmark,      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  'Energy':        { icon: Lightbulb,     color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  'Real Estate':   { icon: Home,          color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  'Telecom':       { icon: Radio,         color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  'Tourism':       { icon: Plane,         color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
  'Transport':     { icon: Plane,         color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
  'Fisheries':     { icon: Ship,          color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  },
  'Healthcare':    { icon: HeartPulse,    color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  'Construction':  { icon: Building2,     color: '#a16207', bg: 'rgba(161,98,7,0.12)'    },
  'Manufacturing': { icon: Factory,       color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  'Education':     { icon: GraduationCap, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
};
const SECTORS = ['All', ...Object.keys(SECTOR_META)];

type SortKey    = 'default' | 'cpr_desc' | 'cpr_asc' | 'price_desc' | 'price_asc' | 'name_asc';
type RiskFilter = 'All' | 'low' | 'medium' | 'high';
type ViewMode   = 'list' | 'grid';

const SORT_OPTIONS: { value: SortKey; label: string; sub: string }[] = [
  { value: 'default',    label: 'Default',         sub: 'Original order'          },
  { value: 'cpr_desc',   label: 'CPR High → Low',  sub: 'Best returns first'      },
  { value: 'cpr_asc',    label: 'CPR Low → High',  sub: 'Conservative first'      },
  { value: 'price_desc', label: 'Price High → Low', sub: 'Premium companies first' },
  { value: 'price_asc',  label: 'Price Low → High', sub: 'Affordable first'        },
  { value: 'name_asc',   label: 'Name A → Z',       sub: 'Alphabetical order'      },
];

const RISK_META: Record<RiskFilter, { label: string; color: string; bg: string }> = {
  'All':    { label: 'All Risks', color: 'hsl(var(--foreground))', bg: 'hsl(var(--muted))' },
  'low':    { label: 'Low',       color: '#22c55e', bg: 'rgba(34,197,94,0.1)'               },
  'medium': { label: 'Medium',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'              },
  'high':   { label: 'High',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'               },
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export const InvestTab = () => {
  /* ── Original hooks — UNTOUCHED ── */
  const { companies, loading }          = useCompanies();
  const { wallet, refetch: refetchWallet }          = useWallet();
  const { createInvestment, refetch: refetchInvestments } = useInvestments();

  /* ── Original state — UNTOUCHED ── */
  const [search, setSearch]                 = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<typeof companies[0] | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);

  /* ── New UI state ── */
  const [sortBy, setSortBy]                 = useState<SortKey>('default');
  const [riskFilter, setRiskFilter]         = useState<RiskFilter>('All');
  const [viewMode, setViewMode]             = useState<ViewMode>('list');
  const [showFilterModal, setShowFilterModal]     = useState(false);
  const [showSortModal, setShowSortModal]         = useState(false);
  const [showRiskInfo, setShowRiskInfo]           = useState(false);
  const [showTrendingDrawer, setShowTrendingDrawer] = useState(false);
  const [trendingOnly, setTrendingOnly]           = useState(false);

  /* ── Filter + sort pipeline ── */
  const filteredCompanies = useMemo(() => {
    let res = companies.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.ticker.toLowerCase().includes(search.toLowerCase()) ||
        c.sector.toLowerCase().includes(search.toLowerCase());
      const matchSector = selectedSector === 'All' || c.sector === selectedSector;
      const matchRisk   = riskFilter === 'All' || c.risk_level?.toLowerCase() === riskFilter;
      const matchTrend  = !trendingOnly || c.is_trending;
      return matchSearch && matchSector && matchRisk && matchTrend;
    });
    switch (sortBy) {
      case 'cpr_desc':   res = res.sort((a, b) => (b.cpr_today ?? 0) - (a.cpr_today ?? 0)); break;
      case 'cpr_asc':    res = res.sort((a, b) => (a.cpr_today ?? 0) - (b.cpr_today ?? 0)); break;
      case 'price_desc': res = res.sort((a, b) => (b.current_price ?? 0) - (a.current_price ?? 0)); break;
      case 'price_asc':  res = res.sort((a, b) => (a.current_price ?? 0) - (b.current_price ?? 0)); break;
      case 'name_asc':   res = res.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return res;
  }, [companies, search, selectedSector, riskFilter, trendingOnly, sortBy]);

  /* All trending companies (no slice — drawer shows all) */
  const trendingCompanies = companies.filter(c => c.is_trending);
  /* Preview: first 6 shown in horizontal scroll */
  const trendingPreview   = trendingCompanies.slice(0, 6);

  const activeFilters     = (selectedSector !== 'All' ? 1 : 0) + (riskFilter !== 'All' ? 1 : 0) + (trendingOnly ? 1 : 0);
  const currentSortLabel  = SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Default';

  /* ── Original handleInvest — UNTOUCHED ── */
  const handleInvest = async (amount: number, maturityDays: number) => {
    if (!selectedCompany) return;
    const { error } = await createInvestment(selectedCompany.id, amount, maturityDays);
    if (error) {
      notify.error(error);
    } else {
      notify.success(`Successfully invested ${amount} SLE in ${selectedCompany.ticker} for ${maturityDays} days`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  /* ── Company detail full-screen view — UNTOUCHED ── */
  if (viewingCompanyId) {
    return <CompanyDetail companyId={viewingCompanyId} onBack={() => setViewingCompanyId(null)} />;
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="it-page">
        <div className="it-body">
          <ListSkeleton count={5} />
        </div>
      </div>
    );
  }

  /* ── Risk colour helper ── */
  const riskStyle = (level: string) =>
    level === 'low'    ? { c: '#22c55e', bg: 'rgba(34,197,94,0.1)'  } :
    level === 'medium' ? { c: '#f59e0b', bg: 'rgba(245,158,11,0.1)' } :
                         { c: '#ef4444', bg: 'rgba(239,68,68,0.1)'  };

  return (
    <div className="it-page">

      {/* ═══════════════════════════════════════════
          STICKY HEADER
      ═══════════════════════════════════════════ */}
      <header className="it-header">
        <div className="it-header-inner">
          <div>
            <p className="it-header-sub">Long-term · 7 to 90 days</p>
            <h1 className="it-header-title">Invest</h1>
          </div>
          <div className="it-header-right">
            <button className="it-icon-btn" onClick={() => setShowRiskInfo(true)} title="Risk guide">
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="it-body">

        {/* ═══════════════════════════════════════════
            TRENDING SPOTLIGHT — page starts here
        ═══════════════════════════════════════════ */}
        {trendingPreview.length > 0 && (
          <div>
            <div className="it-section-header">
              <div className="it-section-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Flame className="w-4 h-4" style={{ color: '#ef4444' }} />
              </div>
              <p className="it-section-title">Trending Now</p>
              <button className="it-see-all" onClick={() => setShowTrendingDrawer(true)}>
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="it-trending-track">
              {trendingPreview.map(co => {
                const meta  = SECTOR_META[co.sector] || { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
                const cprUp = (co.cpr_today ?? 0) >= 0;
                return (
                  /* Outer div — not a button, avoids nested button warning */
                  <div key={co.id} className="it-tcard">
                    <span className="it-tcard-shimmer" />
                    {/* Tappable info area → opens detail page */}
                    <button className="it-tcard-body" onClick={() => setViewingCompanyId(co.id)}>
                      <div className="it-tcard-top">
                        <div className="it-tcard-logo" style={{ background: meta.bg }}>
                          <span className="it-tcard-ticker" style={{ color: meta.color }}>
                            {co.ticker.slice(0, 2)}
                          </span>
                        </div>
                        <span className="it-tcard-fire">🔥</span>
                      </div>
                      <p className="it-tcard-name">{co.name}</p>
                      <p className="it-tcard-sector">{co.sector}</p>
                      <span className={cn('it-tcard-cpr', cprUp ? 'it-up' : 'it-down')}>
                        {cprUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {cprUp ? '+' : ''}{(co.cpr_today ?? 0).toFixed(1)}% CPR
                      </span>
                    </button>
                    {/* Invest button → opens invest modal */}
                    <button
                      className="it-tcard-invest"
                      style={{ background: meta.color }}
                      onClick={() => setSelectedCompany(co)}
                    >
                      Invest Now
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTOR PILLS
        ═══════════════════════════════════════════ */}
        <div className="it-sectors-row">
          {SECTORS.map(sector => {
            const meta = SECTOR_META[sector];
            const Icon = meta?.icon;
            const isOn = selectedSector === sector;
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={cn('it-sector-pill', isOn && 'it-sector-pill--on')}
                style={isOn
                  ? { background: meta?.color ?? 'hsl(var(--primary))', borderColor: meta?.color ?? 'hsl(var(--primary))', color: 'white' }
                  : {}}
              >
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                {sector}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════
            SEARCH
        ═══════════════════════════════════════════ */}
        <div className="it-search-wrap">
          <Search className="it-search-icon" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies, tickers, sectors..."
            className="it-search-input"
          />
          {search && (
            <button className="it-search-clear" onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════
            TOOLBAR
        ═══════════════════════════════════════════ */}
        <div className="it-toolbar">
          <p className="it-toolbar-count">
            <span className="it-toolbar-num">{filteredCompanies.length}</span>
            {' '}compan{filteredCompanies.length === 1 ? 'y' : 'ies'}
            {search && <span className="it-toolbar-query"> · "{search}"</span>}
          </p>
          <div className="it-toolbar-right">
            <button
              className={cn('it-tool-btn', activeFilters > 0 && 'it-tool-btn--on')}
              onClick={() => setShowFilterModal(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter{activeFilters > 0 && ` (${activeFilters})`}
            </button>
            <button className="it-tool-btn" onClick={() => setShowSortModal(true)}>
              <BarChart3 className="w-3.5 h-3.5" />
              Sort
            </button>
            <button
              className="it-tool-btn it-tool-btn--icon"
              onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <LayoutList className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Active filter tags */}
        {(activeFilters > 0 || sortBy !== 'default') && (
          <div className="it-filter-tags">
            {selectedSector !== 'All' && (
              <span className="it-ftag">{selectedSector}<button onClick={() => setSelectedSector('All')}>×</button></span>
            )}
            {riskFilter !== 'All' && (
              <span className="it-ftag" style={{ color: RISK_META[riskFilter].color, background: RISK_META[riskFilter].bg, borderColor: `${RISK_META[riskFilter].color}30` }}>
                {RISK_META[riskFilter].label} Risk<button onClick={() => setRiskFilter('All')}>×</button>
              </span>
            )}
            {trendingOnly && (
              <span className="it-ftag">🔥 Trending<button onClick={() => setTrendingOnly(false)}>×</button></span>
            )}
            {sortBy !== 'default' && (
              <span className="it-ftag">{currentSortLabel}<button onClick={() => setSortBy('default')}>×</button></span>
            )}
            <button className="it-clear-all" onClick={() => { setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); setSortBy('default'); }}>
              Clear all
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            COMPANY CARDS
            - Tap card body → opens CompanyDetail
            - Tap Invest btn → opens InvestModal
        ═══════════════════════════════════════════ */}
        {filteredCompanies.length > 0 ? (
          <div className={viewMode === 'list' ? 'it-company-list' : 'it-company-grid'}>
            {filteredCompanies.map(company => (
              <CompanyCard
                key={company.id}
                name={company.name}
                ticker={company.ticker}
                sector={company.sector}
                price={company.current_price}
                change={company.price_change_percent}
                riskLevel={company.risk_level}
                isTrending={company.is_trending}
                marketCap={(company as { market_cap?: number }).market_cap}
                country={(company as { country?: 'SL' | 'INT' }).country}
                bestPct={company.max_return_percent}
                worstPct={company.min_return_percent}
                onInvest={() => setSelectedCompany(company)}
                onView={() => setViewingCompanyId(company.id)}
              />
            ))}
          </div>
        ) : (
          <div className="it-empty">
            <p className="it-empty-icon">🔍</p>
            <p className="it-empty-title">No companies found</p>
            <p className="it-empty-sub">
              {search ? `No results for "${search}"` : 'Try adjusting your filters'}
            </p>
            <button
              className="it-empty-btn"
              onClick={() => { setSearch(''); setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); setSortBy('default'); }}
            >
              Reset filters
            </button>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════
          TRENDING DRAWER — all trending companies
      ═══════════════════════════════════════════ */}
      {showTrendingDrawer && (
        <div className="it-overlay" onClick={() => setShowTrendingDrawer(false)}>
          <div className="it-sheet" onClick={e => e.stopPropagation()}>
            <div className="it-sheet-handle" />
            <div className="it-sheet-head">
              <div className="it-sheet-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Flame className="w-4 h-4" style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="it-sheet-title">Trending Now</p>
                <p className="it-sheet-sub">{trendingCompanies.length} trending compan{trendingCompanies.length === 1 ? 'y' : 'ies'}</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowTrendingDrawer(false)}>✕</button>
            </div>

            <div className="it-drawer-list">
              {trendingCompanies.length === 0 ? (
                <p className="it-empty-sub" style={{ textAlign: 'center', padding: '24px 0' }}>No trending companies right now</p>
              ) : trendingCompanies.map(co => {
                const meta  = SECTOR_META[co.sector] || { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
                const cprUp = (co.cpr_today ?? 0) >= 0;
                const risk  = riskStyle(co.risk_level);
                return (
                  <div key={co.id} className="it-drawer-row">
                    <div className="it-drawer-logo" style={{ background: meta.bg }}>
                      <span style={{ color: meta.color, fontSize: 13, fontWeight: 900 }}>{co.ticker.slice(0, 2)}</span>
                    </div>
                    <div className="it-drawer-info">
                      <div className="flex items-center gap-1.5">
                        <p className="it-drawer-name">{co.name}</p>
                        <span>🔥</span>
                      </div>
                      <div className="it-drawer-meta">
                        <span>{co.ticker}</span>
                        <span className="it-drawer-dot" />
                        <span>{co.sector}</span>
                        <span className="it-drawer-dot" />
                        <span className="it-drawer-risk" style={{ color: risk.c, background: risk.bg }}>
                          {co.risk_level}
                        </span>
                      </div>
                    </div>
                    <div className="it-drawer-right">
                      <span className={cn('it-drawer-cpr', cprUp ? 'it-up' : 'it-down')}>
                        {cprUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {cprUp ? '+' : ''}{(co.cpr_today ?? 0).toFixed(1)}%
                      </span>
                      <div className="it-drawer-actions">
                        <button
                          className="it-drawer-eye"
                          onClick={() => { setShowTrendingDrawer(false); setViewingCompanyId(co.id); }}
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="it-drawer-invest"
                          style={{ background: meta.color }}
                          onClick={() => { setShowTrendingDrawer(false); setSelectedCompany(co); }}
                        >
                          Invest
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          FILTER MODAL
      ═══════════════════════════════════════════ */}
      {showFilterModal && (
        <div className="it-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="it-sheet" onClick={e => e.stopPropagation()}>
            <div className="it-sheet-handle" />
            <div className="it-sheet-head">
              <div className="it-sheet-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <SlidersHorizontal className="w-4 h-4" style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="it-sheet-title">Filter Companies</p>
                <p className="it-sheet-sub">Narrow down your options</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowFilterModal(false)}>✕</button>
            </div>

            {/* Sector */}
            <div className="it-filter-section">
              <p className="it-filter-label">Sector</p>
              <div className="it-filter-sector-grid">
                {SECTORS.map(sector => {
                  const meta = SECTOR_META[sector];
                  const Icon = meta?.icon;
                  const isOn = selectedSector === sector;
                  return (
                    <button
                      key={sector}
                      className={cn('it-filter-sector-btn', isOn && 'it-filter-sector-btn--on')}
                      style={isOn ? { borderColor: meta?.color ?? 'hsl(var(--primary))', color: meta?.color ?? 'hsl(var(--primary))', background: meta?.bg ?? 'hsl(var(--primary)/0.1)' } : {}}
                      onClick={() => setSelectedSector(sector)}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                      {sector}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk */}
            <div className="it-filter-section">
              <div className="it-filter-label-row">
                <p className="it-filter-label">Risk Level</p>
                <button className="it-filter-info" onClick={() => { setShowFilterModal(false); setTimeout(() => setShowRiskInfo(true), 200); }}>
                  <Info className="w-3.5 h-3.5" /> What's this?
                </button>
              </div>
              <div className="it-risk-grid">
                {(Object.keys(RISK_META) as RiskFilter[]).map(r => {
                  const meta = RISK_META[r];
                  const isOn = riskFilter === r;
                  return (
                    <button
                      key={r}
                      className={cn('it-risk-btn', isOn && 'it-risk-btn--on')}
                      style={isOn ? { background: meta.bg, borderColor: `${meta.color}50`, color: meta.color } : {}}
                      onClick={() => setRiskFilter(r)}
                    >
                      {isOn && <Check className="w-3.5 h-3.5" />}
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trending toggle */}
            <div className="it-filter-section">
              <p className="it-filter-label">Special</p>
              <button
                className={cn('it-toggle-row', trendingOnly && 'it-toggle-row--on')}
                onClick={() => setTrendingOnly(t => !t)}
              >
                <div className="flex items-center gap-10px" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🔥</span>
                  <div>
                    <p className="it-toggle-title">Trending only</p>
                    <p className="it-toggle-sub">Show only currently trending companies</p>
                  </div>
                </div>
                <div className={cn('it-toggle-sw', trendingOnly && 'it-toggle-sw--on')}>
                  <div className="it-toggle-thumb" />
                </div>
              </button>
            </div>

            <div className="it-sheet-footer">
              <button className="it-sheet-reset" onClick={() => { setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); }}>Reset</button>
              <button className="it-sheet-apply" onClick={() => setShowFilterModal(false)}>
                Show {filteredCompanies.length} compan{filteredCompanies.length === 1 ? 'y' : 'ies'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          SORT MODAL
      ═══════════════════════════════════════════ */}
      {showSortModal && (
        <div className="it-overlay" onClick={() => setShowSortModal(false)}>
          <div className="it-sheet" onClick={e => e.stopPropagation()}>
            <div className="it-sheet-handle" />
            <div className="it-sheet-head">
              <div className="it-sheet-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <BarChart3 className="w-4 h-4" style={{ color: '#10b981' }} />
              </div>
              <div>
                <p className="it-sheet-title">Sort Companies</p>
                <p className="it-sheet-sub">Choose how to order results</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowSortModal(false)}>✕</button>
            </div>
            <div className="it-sort-list">
              {SORT_OPTIONS.map(opt => {
                const isOn = sortBy === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={cn('it-sort-opt', isOn && 'it-sort-opt--on')}
                    onClick={() => { setSortBy(opt.value); setShowSortModal(false); }}
                  >
                    <div className="flex-1 text-left">
                      <p className="it-sort-label">{opt.label}</p>
                      <p className="it-sort-sub">{opt.sub}</p>
                    </div>
                    {isOn && <div className="it-sort-check"><Check className="w-3.5 h-3.5" /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          RISK INFO MODAL
      ═══════════════════════════════════════════ */}
      {showRiskInfo && (
        <div className="it-overlay" onClick={() => setShowRiskInfo(false)}>
          <div className="it-sheet" onClick={e => e.stopPropagation()}>
            <div className="it-sheet-handle" />
            <div className="it-sheet-head">
              <div className="it-sheet-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Shield className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="it-sheet-title">Investment Risk Guide</p>
                <p className="it-sheet-sub">Understand levels before you invest</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowRiskInfo(false)}>✕</button>
            </div>
            <div className="it-risk-info-list">
              {[
                { emoji: '🟢', label: 'Low Risk',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  body: 'Stable fundamentals and consistent returns. Best for conservative investors seeking steady growth with lower volatility.' },
                { emoji: '🟡', label: 'Medium Risk',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', body: 'Moderate volatility. Good balance between risk and reward for investors comfortable with some fluctuations.' },
                { emoji: '🔴', label: 'High Risk',    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  body: 'Significant volatility. Higher potential returns but also greater risk of capital loss. For experienced investors only.' },
              ].map(item => (
                <div key={item.label} className="it-risk-card" style={{ background: item.bg, borderColor: item.border }}>
                  <div className="flex items-center gap-8px" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <p style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.label}</p>
                  </div>
                  <p className="it-risk-card-body">{item.body}</p>
                </div>
              ))}
              <div className="it-risk-disclaimer">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p>All investments carry risk. Capital invested is not guaranteed. Past performance does not predict future results.</p>
              </div>
            </div>
            <button className="it-sheet-apply" onClick={() => setShowRiskInfo(false)}>Got it, understood</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          INVEST MODAL — original logic UNTOUCHED
      ═══════════════════════════════════════════ */}
      {selectedCompany && wallet && (
        <InvestModal
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
          company={{
            id: selectedCompany.id,
            name: selectedCompany.name,
            ticker: selectedCompany.ticker,
            minInvestment: Number(selectedCompany.min_investment) || 50,
            riskLevel: selectedCompany.risk_level,
            cprToday: Number(selectedCompany.cpr_today) || 0,
            bestPct: selectedCompany.max_return_percent,
            worstPct: selectedCompany.min_return_percent,
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}

      {/* ═══════════════════════════════════════════
          ALL STYLES
      ═══════════════════════════════════════════ */}
      <style>{`
        .it-page { min-height: 100vh; background: hsl(var(--background)); display: flex; flex-direction: column; }
        .it-body { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 14px 16px 32px; }

        /* Header */
        .it-header {
          position: sticky; top: 0; z-index: 40;
          background: hsl(var(--background)/0.97);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid hsl(var(--border));
        }
        .it-header-inner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; }
        .it-header-sub   { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }
        .it-header-title { font-size: 22px; font-weight: 900; color: hsl(var(--foreground)); letter-spacing: -0.4px; line-height: 1.15; }
        .it-header-right { display: flex; align-items: center; gap: 8px; }
        .it-icon-btn {
          width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--foreground));
          transition: transform 0.15s; -webkit-tap-highlight-color: transparent;
        }
        .it-icon-btn:active { transform: scale(0.88); }

        /* Section header */
        .it-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .it-section-icon { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .it-section-title { font-size: 14px; font-weight: 800; color: hsl(var(--foreground)); flex: 1; }
        .it-see-all { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; padding: 4px; }

        /* Trending cards */
        .it-trending-track { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding: 2px 0 4px; }
        .it-trending-track::-webkit-scrollbar { display: none; }
        .it-tcard {
          position: relative; overflow: hidden; flex-shrink: 0;
          width: 156px; border-radius: 20px; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); display: flex; flex-direction: column;
        }
        .it-tcard-shimmer {
          pointer-events: none; position: absolute; inset: 0; z-index: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%);
          background-size: 200% 100%;
          animation: itShimmer 3.5s ease-in-out infinite;
        }
        @keyframes itShimmer {
          0%        { background-position: 200% 0; opacity: 0; }
          10%       { opacity: 1; }
          50%       { background-position: -200% 0; opacity: 1; }
          60%,100%  { background-position: -200% 0; opacity: 0; }
        }
        .it-tcard-body {
          display: flex; flex-direction: column; gap: 4px;
          padding: 14px 14px 10px; text-align: left; background: none; border: none;
          cursor: pointer; -webkit-tap-highlight-color: transparent; width: 100%;
          transition: background 0.15s; position: relative; z-index: 1;
        }
        .it-tcard-body:active { background: hsl(var(--muted)/0.35); }
        .it-tcard-top    { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .it-tcard-logo   { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .it-tcard-ticker { font-size: 13px; font-weight: 900; }
        .it-tcard-fire   { font-size: 16px; }
        .it-tcard-name   { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .it-tcard-sector { font-size: 10px; color: hsl(var(--muted-foreground)); }
        .it-tcard-cpr    { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; margin-top: 4px; }
        .it-tcard-invest {
          width: 100%; padding: 9px; border: none; color: white;
          font-size: 12px; font-weight: 800; cursor: pointer;
          border-radius: 0 0 19px 19px;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s; position: relative; z-index: 1;
        }
        .it-tcard-invest:active { opacity: 0.75; }
        .it-up   { color: #22c55e; }
        .it-down { color: #ef4444; }

        /* Sector pills */
        .it-sectors-row { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
        .it-sectors-row::-webkit-scrollbar { display: none; }
        .it-sector-pill {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          padding: 6px 13px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--foreground));
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s; white-space: nowrap;
        }
        .it-sector-pill:active { transform: scale(0.93); }

        /* Search */
        .it-search-wrap { position: relative; display: flex; align-items: center; }
        .it-search-icon { position: absolute; left: 13px; width: 16px; height: 16px; color: hsl(var(--muted-foreground)); pointer-events: none; }
        .it-search-input {
          width: 100%; height: 46px; border-radius: 14px; padding: 0 40px 0 42px;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          font-size: 13px; color: hsl(var(--foreground)); outline: none; transition: border-color 0.2s;
        }
        .it-search-input:focus { border-color: hsl(var(--primary)); }
        .it-search-input::placeholder { color: hsl(var(--muted-foreground)); }
        .it-search-clear {
          position: absolute; right: 11px; width: 24px; height: 24px; border-radius: 9999px;
          background: hsl(var(--muted)); border: none; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--muted-foreground));
        }

        /* Toolbar */
        .it-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .it-toolbar-right { display: flex; align-items: center; gap: 6px; }
        .it-toolbar-count { font-size: 12px; color: hsl(var(--muted-foreground)); }
        .it-toolbar-num   { font-size: 15px; font-weight: 900; color: hsl(var(--foreground)); }
        .it-toolbar-query { color: hsl(var(--primary)); font-weight: 600; }
        .it-tool-btn {
          display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 11px;
          font-size: 12px; font-weight: 600; border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          color: hsl(var(--foreground)); cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s;
        }
        .it-tool-btn:active { transform: scale(0.93); }
        .it-tool-btn--on  { border-color: hsl(var(--primary)); color: hsl(var(--primary)); background: hsl(var(--primary)/0.07); font-weight: 700; }
        .it-tool-btn--icon { padding: 7px; }

        /* Filter tags */
        .it-filter-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .it-ftag {
          display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9999px;
          font-size: 11px; font-weight: 700; background: hsl(var(--primary)/0.1); color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary)/0.25);
        }
        .it-ftag button { background: none; border: none; font-size: 14px; cursor: pointer; line-height: 1; padding: 0; color: inherit; }
        .it-clear-all { font-size: 11px; font-weight: 700; color: hsl(var(--muted-foreground)); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px; }

        /* Company list/grid */
        .it-company-list { display: flex; flex-direction: column; gap: 10px; }
        .it-company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        /* Empty */
        .it-empty { text-align: center; padding: 40px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .it-empty-icon  { font-size: 44px; }
        .it-empty-title { font-size: 17px; font-weight: 800; color: hsl(var(--foreground)); }
        .it-empty-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); line-height: 1.5; max-width: 260px; }
        .it-empty-btn   {
          display: inline-flex; padding: 10px 22px; border-radius: 13px;
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 4px 14px hsl(var(--primary)/0.3); margin-top: 4px; transition: transform 0.15s;
        }
        .it-empty-btn:active { transform: scale(0.96); }

        /* Skeleton */
        .it-skel { height: 84px; border-radius: 16px; background: hsl(var(--muted)); animation: itPulse 1.4s ease-in-out infinite; }
        @keyframes itPulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

        /* Overlay + sheet */
        .it-overlay {
          position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px); display: flex; align-items: flex-end;
          animation: itFade 0.18s ease;
        }
        @keyframes itFade { from{opacity:0;} to{opacity:1;} }
        .it-sheet {
          width: 100%; max-height: 90vh; overflow-y: auto;
          background: hsl(var(--card)); border-radius: 28px 28px 0 0;
          border-top: 1px solid hsl(var(--border)); padding: 10px 18px 28px;
          animation: itSlide 0.25s cubic-bezier(0.34,1.15,0.64,1);
          display: flex; flex-direction: column;
        }
        @keyframes itSlide { from{transform:translateY(100%);} to{transform:translateY(0);} }
        .it-sheet-handle { width: 40px; height: 4px; border-radius: 9999px; background: hsl(var(--muted)); margin: 0 auto 18px; flex-shrink: 0; }
        .it-sheet-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-shrink: 0; }
        .it-sheet-icon { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .it-sheet-title { font-size: 16px; font-weight: 900; color: hsl(var(--foreground)); }
        .it-sheet-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .it-sheet-close { margin-left: auto; width: 32px; height: 32px; border-radius: 10px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: hsl(var(--foreground)); flex-shrink: 0; }

        /* Trending drawer list */
        .it-drawer-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .it-drawer-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid hsl(var(--border)/0.5); }
        .it-drawer-row:last-child { border-bottom: none; }
        .it-drawer-logo { width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .it-drawer-info { flex: 1; min-width: 0; }
        .it-drawer-name { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .it-drawer-meta { display: flex; align-items: center; gap: 5px; margin-top: 3px; font-size: 10px; color: hsl(var(--muted-foreground)); flex-wrap: wrap; }
        .it-drawer-dot  { width: 3px; height: 3px; border-radius: 9999px; background: hsl(var(--muted-foreground)); }
        .it-drawer-risk { padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 700; }
        .it-drawer-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
        .it-drawer-cpr  { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 800; }
        .it-drawer-actions { display: flex; align-items: center; gap: 6px; }
        .it-drawer-eye {
          width: 28px; height: 28px; border-radius: 8px; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--muted-foreground)); -webkit-tap-highlight-color: transparent; transition: all 0.15s;
        }
        .it-drawer-eye:active { transform: scale(0.88); }
        .it-drawer-invest { padding: 6px 12px; border-radius: 9px; border: none; color: white; font-size: 11px; font-weight: 800; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: opacity 0.15s; }
        .it-drawer-invest:active { opacity: 0.75; }

        /* Filter modal */
        .it-filter-section { margin-bottom: 20px; }
        .it-filter-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground)); margin-bottom: 10px; display: block; }
        .it-filter-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .it-filter-info { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; }
        .it-filter-sector-grid { display: flex; flex-wrap: wrap; gap: 7px; }
        .it-filter-sector-btn {
          display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 9999px;
          font-size: 12px; font-weight: 600; border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          color: hsl(var(--foreground)); cursor: pointer; transition: all 0.15s;
        }
        .it-filter-sector-btn--on { font-weight: 700; }
        .it-risk-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .it-risk-btn {
          display: flex; align-items: center; justify-content: center; gap: 5px; padding: 10px 6px;
          border-radius: 13px; font-size: 12px; font-weight: 600; border: 1.5px solid hsl(var(--border));
          background: hsl(var(--card)); color: hsl(var(--foreground)); cursor: pointer; transition: all 0.15s;
        }
        .it-risk-btn--on { font-weight: 800; }
        .it-toggle-row {
          display: flex; align-items: center; justify-content: space-between; padding: 14px 16px;
          border-radius: 16px; border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent; width: 100%; transition: all 0.15s;
        }
        .it-toggle-row--on { border-color: hsl(var(--primary)/0.4); background: hsl(var(--primary)/0.05); }
        .it-toggle-title { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); }
        .it-toggle-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .it-toggle-sw {
          width: 44px; height: 24px; border-radius: 9999px; background: hsl(var(--muted));
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .it-toggle-sw--on { background: hsl(var(--primary)); }
        .it-toggle-thumb {
          position: absolute; top: 3px; left: 3px; width: 18px; height: 18px;
          border-radius: 9999px; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s cubic-bezier(0.34,1.3,0.64,1);
        }
        .it-toggle-sw--on .it-toggle-thumb { transform: translateX(20px); }
        .it-sheet-footer { display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid hsl(var(--border)); margin-top: 8px; flex-shrink: 0; }
        .it-sheet-reset { flex: 0 0 88px; height: 50px; border-radius: 16px; border: 1.5px solid hsl(var(--border)); background: none; font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); cursor: pointer; }
        .it-sheet-apply {
          flex: 1; height: 50px; border-radius: 16px; border: none;
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          font-size: 14px; font-weight: 800; cursor: pointer;
          box-shadow: 0 6px 20px hsl(var(--primary)/0.35); transition: transform 0.15s;
        }
        .it-sheet-apply:active { transform: scale(0.97); }

        /* Sort modal */
        .it-sort-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .it-sort-opt {
          display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s; width: 100%;
        }
        .it-sort-opt--on { border-color: hsl(var(--primary)/0.4); background: hsl(var(--primary)/0.06); }
        .it-sort-label { font-size: 14px; font-weight: 700; color: hsl(var(--foreground)); }
        .it-sort-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; }
        .it-sort-check { width: 26px; height: 26px; border-radius: 9999px; flex-shrink: 0; background: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; color: hsl(var(--primary-foreground)); }

        /* Risk info */
        .it-risk-info-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .it-risk-card { padding: 16px; border-radius: 16px; border: 1px solid; }
        .it-risk-card-body { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.6; }
        .it-risk-disclaimer {
          display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px;
          border-radius: 14px; background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.2);
          font-size: 11px; color: hsl(var(--muted-foreground)); line-height: 1.5;
        }

        /* Responsive */
        @media (min-width: 640px) {
          .it-body { max-width: 680px; margin: 0 auto; padding: 16px 24px 32px; }
          .it-header-inner { max-width: 680px; margin: 0 auto; padding: 12px 24px; }
          .it-company-grid { grid-template-columns: repeat(3,1fr); }
          .it-risk-grid { grid-template-columns: repeat(4,1fr); }
        }
      `}</style>
    </div>
  );
};
