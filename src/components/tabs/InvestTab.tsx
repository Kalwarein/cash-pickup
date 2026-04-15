import { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, X, ChevronRight, ChevronDown,
  TrendingUp, TrendingDown, Flame, Shield, AlertTriangle,
  Zap, ArrowUpRight, ArrowDownRight, Wallet, BarChart3,
  Check, Info, Star, Filter, LayoutGrid, LayoutList,
  Building2, Leaf, Cpu, Landmark, Lightbulb, Home,
  Radio, Plane, Ship, HeartPulse, HardHat, Factory, GraduationCap
} from 'lucide-react';
import { CompanyCard } from '@/components/CompanyCard';
import { CompanyDetail } from '@/components/CompanyDetail';
import { InvestModal } from '@/components/InvestModal';
import { useCompanies } from '@/hooks/useCompanies';
import { useWallet } from '@/hooks/useWallet';
import { useInvestments } from '@/hooks/useInvestments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sle } from '@/lib/currency';

/* ─── Sector config ──────────────────────────────────────── */
const SECTOR_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Mining':         { icon: HardHat,      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  'Agriculture':    { icon: Leaf,         color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  'Technology':     { icon: Cpu,          color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  'Finance':        { icon: Landmark,     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  'Energy':         { icon: Lightbulb,    color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  'Real Estate':    { icon: Home,         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  'Telecom':        { icon: Radio,        color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  'Tourism':        { icon: Plane,        color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
  'Transport':      { icon: Plane,        color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)'  },
  'Fisheries':      { icon: Ship,         color: '#14b8a6', bg: 'rgba(20,184,166,0.12)'  },
  'Healthcare':     { icon: HeartPulse,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
  'Construction':   { icon: Building2,    color: '#a16207', bg: 'rgba(161,98,7,0.12)'    },
  'Manufacturing':  { icon: Factory,      color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  'Education':      { icon: GraduationCap,color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
};

const SECTORS = ['All', ...Object.keys(SECTOR_META)];

type SortKey = 'default' | 'cpr_desc' | 'cpr_asc' | 'price_desc' | 'price_asc' | 'name_asc';
type RiskFilter = 'All' | 'low' | 'medium' | 'high';
type ViewMode = 'list' | 'grid';

const SORT_OPTIONS: { value: SortKey; label: string; sub: string }[] = [
  { value: 'default',    label: 'Default',          sub: 'Original order'          },
  { value: 'cpr_desc',   label: 'CPR High → Low',   sub: 'Best returns first'      },
  { value: 'cpr_asc',    label: 'CPR Low → High',   sub: 'Conservative first'      },
  { value: 'price_desc', label: 'Price High → Low',  sub: 'Premium companies first' },
  { value: 'price_asc',  label: 'Price Low → High',  sub: 'Affordable first'        },
  { value: 'name_asc',   label: 'Name A → Z',        sub: 'Alphabetical order'      },
];

const RISK_META: Record<RiskFilter, { label: string; color: string; bg: string }> = {
  'All':    { label: 'All Risks',  color: 'hsl(var(--foreground))', bg: 'hsl(var(--muted))'  },
  'low':    { label: 'Low',        color: '#22c55e',                bg: 'rgba(34,197,94,0.1)'  },
  'medium': { label: 'Medium',     color: '#f59e0b',                bg: 'rgba(245,158,11,0.1)' },
  'high':   { label: 'High',       color: '#ef4444',                bg: 'rgba(239,68,68,0.1)'  },
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export const InvestTab = () => {
  /* ── Original hooks — UNTOUCHED ── */
  const { companies, loading } = useCompanies();
  const { wallet, refetch: refetchWallet } = useWallet();
  const { createInvestment, refetch: refetchInvestments } = useInvestments();

  /* ── Original state ── */
  const [search, setSearch]                 = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState<typeof companies[0] | null>(null);
  const [viewingCompanyId, setViewingCompanyId] = useState<string | null>(null);

  /* ── New UI state ── */
  const [sortBy, setSortBy]           = useState<SortKey>('default');
  const [riskFilter, setRiskFilter]   = useState<RiskFilter>('All');
  const [viewMode, setViewMode]       = useState<ViewMode>('list');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal]     = useState(false);
  const [showRiskInfo, setShowRiskInfo]       = useState(false);
  const [trendingOnly, setTrendingOnly]       = useState(false);

  /* ── Filter + sort pipeline ── */
  const filteredCompanies = useMemo(() => {
    let res = companies.filter(c => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.ticker.toLowerCase().includes(search.toLowerCase()) ||
        c.sector.toLowerCase().includes(search.toLowerCase());
      const matchSector = selectedSector === 'All' || c.sector === selectedSector;
      const matchRisk   = riskFilter === 'All' || c.risk_level === riskFilter;
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

  const trendingCompanies = companies.filter(c => c.is_trending).slice(0, 4);
  const activeFilters = (selectedSector !== 'All' ? 1 : 0) + (riskFilter !== 'All' ? 1 : 0) + (trendingOnly ? 1 : 0);
  const currentSortLabel = SORT_OPTIONS.find(s => s.value === sortBy)?.label || 'Default';

  /* ── Original handleInvest — UNTOUCHED ── */
  const handleInvest = async (amount: number, maturityDays: number) => {
    if (!selectedCompany) return;
    const { error } = await createInvestment(selectedCompany.id, amount, maturityDays);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`Successfully invested ${amount} SLE in ${selectedCompany.ticker} for ${maturityDays} days`);
      await refetchWallet();
      await refetchInvestments();
    }
  };

  /* ── Company detail view — UNTOUCHED ── */
  if (viewingCompanyId) {
    return <CompanyDetail companyId={viewingCompanyId} onBack={() => setViewingCompanyId(null)} />;
  }

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="it-page">
        <div className="it-body">
          <div className="it-skeleton-hero" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="it-skeleton-card" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

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
            {/* Wallet pill */}
            <div className="it-wallet-pill">
              <Wallet className="w-3.5 h-3.5" />
              <span>{sle(wallet?.balance ?? 0)}</span>
            </div>
            <button
              className="it-icon-btn"
              onClick={() => setShowRiskInfo(true)}
              title="Risk guide"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="it-body">

        {/* ═══════════════════════════════════════════
            WALLET HERO CARD
        ═══════════════════════════════════════════ */}
        <div className="it-wallet-card">
          <span className="it-wallet-shimmer" />
          <div className="it-wallet-orb" />
          <div className="it-wallet-inner">
            <div>
              <p className="it-wallet-label">Available Balance</p>
              <p className="it-wallet-amount">{sle(wallet?.balance ?? 0)}</p>
              <p className="it-wallet-sub">Ready to invest</p>
            </div>
            <div className="it-wallet-stats">
              <div className="it-wallet-stat">
                <p className="it-wallet-stat-val">{companies.length}</p>
                <p className="it-wallet-stat-lbl">Companies</p>
              </div>
              <div className="it-wallet-sep" />
              <div className="it-wallet-stat">
                <p className="it-wallet-stat-val">{trendingCompanies.length}</p>
                <p className="it-wallet-stat-lbl">Trending</p>
              </div>
              <div className="it-wallet-sep" />
              <div className="it-wallet-stat">
                <p className="it-wallet-stat-val">{SECTORS.length - 1}</p>
                <p className="it-wallet-stat-lbl">Sectors</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════
            TRENDING SPOTLIGHT
        ═══════════════════════════════════════════ */}
        {trendingCompanies.length > 0 && (
          <div>
            <div className="it-section-header">
              <div className="it-section-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Flame className="w-4 h-4" style={{ color: '#ef4444' }} />
              </div>
              <p className="it-section-title">Trending Now</p>
              <button
                className="it-see-all"
                onClick={() => setTrendingOnly(true)}
              >
                See all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="it-trending-track">
              {trendingCompanies.map(co => {
                const meta = SECTOR_META[co.sector] || { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
                const cprUp = (co.cpr_today ?? 0) >= 0;
                return (
                  <button
                    key={co.id}
                    className="it-trending-card"
                    onClick={() => setViewingCompanyId(co.id)}
                  >
                    <span className="it-trending-shimmer" />
                    <div className="it-trending-top">
                      <div className="it-trending-logo" style={{ background: meta.bg }}>
                        <span className="it-trending-ticker">{co.ticker.slice(0, 2)}</span>
                      </div>
                      <span className="it-trending-flame">🔥</span>
                    </div>
                    <p className="it-trending-name">{co.name}</p>
                    <p className="it-trending-sector">{co.sector}</p>
                    <div className={cn('it-trending-cpr', cprUp ? 'it-up' : 'it-down')}>
                      {cprUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {cprUp ? '+' : ''}{(co.cpr_today ?? 0).toFixed(1)}% CPR
                    </div>
                    <button
                      className="it-trending-invest-btn"
                      style={{ background: meta.color }}
                      onClick={e => { e.stopPropagation(); setSelectedCompany(co); }}
                    >
                      Invest Now
                    </button>
                  </button>
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
                style={isOn && meta ? {
                  background: meta.color,
                  borderColor: meta.color,
                  color: 'white',
                } : isOn ? {
                  background: 'hsl(var(--primary))',
                  borderColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                } : {}}
              >
                {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                {sector}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════
            SEARCH + TOOLBAR
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

        <div className="it-toolbar">
          <p className="it-toolbar-count">
            <span className="it-toolbar-num">{filteredCompanies.length}</span>
            {' '}compan{filteredCompanies.length === 1 ? 'y' : 'ies'}
            {search && <span className="it-toolbar-query"> · "{search}"</span>}
          </p>
          <div className="it-toolbar-right">
            {/* Filter */}
            <button
              className={cn('it-tool-btn', activeFilters > 0 && 'it-tool-btn--on')}
              onClick={() => setShowFilterModal(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter{activeFilters > 0 && ` (${activeFilters})`}
            </button>

            {/* Sort */}
            <button className="it-tool-btn" onClick={() => setShowSortModal(true)}>
              <BarChart3 className="w-3.5 h-3.5" />
              Sort
            </button>

            {/* View toggle */}
            <button
              className="it-tool-btn it-tool-btn--icon"
              onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list'
                ? <LayoutGrid className="w-4 h-4" />
                : <LayoutList className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Active filter tags */}
        {(activeFilters > 0 || sortBy !== 'default') && (
          <div className="it-filter-tags">
            {selectedSector !== 'All' && (
              <span className="it-ftag">
                {selectedSector}
                <button onClick={() => setSelectedSector('All')}>×</button>
              </span>
            )}
            {riskFilter !== 'All' && (
              <span className="it-ftag" style={{ color: RISK_META[riskFilter].color, background: RISK_META[riskFilter].bg, borderColor: `${RISK_META[riskFilter].color}30` }}>
                {RISK_META[riskFilter].label} Risk
                <button onClick={() => setRiskFilter('All')}>×</button>
              </span>
            )}
            {trendingOnly && (
              <span className="it-ftag">
                🔥 Trending
                <button onClick={() => setTrendingOnly(false)}>×</button>
              </span>
            )}
            {sortBy !== 'default' && (
              <span className="it-ftag">
                {currentSortLabel}
                <button onClick={() => setSortBy('default')}>×</button>
              </span>
            )}
            <button
              className="it-clear-all"
              onClick={() => { setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); setSortBy('default'); }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            COMPANIES
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
                onInvest={() => setSelectedCompany(company)}
                onView={() => setViewingCompanyId(company.id)}
              />
            ))}
          </div>
        ) : (
          <div className="it-empty">
            <div className="it-empty-icon">🔍</div>
            <p className="it-empty-title">No companies found</p>
            <p className="it-empty-sub">
              {search
                ? `No results for "${search}". Try a different name or ticker.`
                : 'Try adjusting your filters or sector selection.'}
            </p>
            <button
              className="it-empty-btn"
              onClick={() => { setSearch(''); setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); setSortBy('default'); }}
            >
              Reset all filters
            </button>
          </div>
        )}

      </div>{/* end it-body */}

      {/* ═══════════════════════════════════════════
          FILTER MODAL — bottom sheet
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
                <p className="it-sheet-sub">Narrow down your investment options</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowFilterModal(false)}>✕</button>
            </div>

            {/* Sector filter in modal */}
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
                      style={isOn && meta ? { borderColor: meta.color, color: meta.color, background: meta.bg } :
                             isOn ? { borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.1)' } : {}}
                      onClick={() => setSelectedSector(sector)}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
                      {sector}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk filter */}
            <div className="it-filter-section">
              <div className="it-filter-label-row">
                <p className="it-filter-label">Risk Level</p>
                <button className="it-filter-info-btn" onClick={() => { setShowFilterModal(false); setTimeout(() => setShowRiskInfo(true), 200); }}>
                  <Info className="w-3.5 w-3.5" /> What's this?
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
                <div className="it-toggle-left">
                  <span className="text-lg">🔥</span>
                  <div>
                    <p className="it-toggle-title">Trending only</p>
                    <p className="it-toggle-sub">Show only currently trending companies</p>
                  </div>
                </div>
                <div className={cn('it-toggle-switch', trendingOnly && 'it-toggle-switch--on')}>
                  <div className="it-toggle-thumb" />
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="it-sheet-footer">
              <button
                className="it-sheet-reset"
                onClick={() => { setSelectedSector('All'); setRiskFilter('All'); setTrendingOnly(false); }}
              >
                Reset
              </button>
              <button
                className="it-sheet-apply"
                onClick={() => setShowFilterModal(false)}
              >
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
                      <p className="it-sort-opt-label">{opt.label}</p>
                      <p className="it-sort-opt-sub">{opt.sub}</p>
                    </div>
                    {isOn && (
                      <div className="it-sort-check">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
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
                <p className="it-sheet-sub">Understand risk levels before you invest</p>
              </div>
              <button className="it-sheet-close" onClick={() => setShowRiskInfo(false)}>✕</button>
            </div>

            <div className="it-risk-info-list">
              {[
                {
                  color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)',
                  label: 'Low Risk', emoji: '🟢',
                  body: 'Company has stable fundamentals and consistent CPR. Suitable for conservative investors seeking steady returns. Lower potential upside but capital is more protected.',
                },
                {
                  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
                  label: 'Medium Risk', emoji: '🟡',
                  body: 'Moderate volatility in returns. Good balance between risk and reward. Suitable for investors comfortable with some fluctuations in their portfolio value.',
                },
                {
                  color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)',
                  label: 'High Risk', emoji: '🔴',
                  body: 'Significant volatility. Potential for higher returns but also higher losses. Only suitable for experienced investors who can afford to lose their invested capital.',
                },
              ].map(item => (
                <div key={item.label} className="it-risk-info-card" style={{ background: item.bg, borderColor: item.border }}>
                  <div className="it-risk-info-top">
                    <span className="text-xl">{item.emoji}</span>
                    <p className="it-risk-info-label" style={{ color: item.color }}>{item.label}</p>
                  </div>
                  <p className="it-risk-info-body">{item.body}</p>
                </div>
              ))}

              <div className="it-risk-disclaimer">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p>All investments carry risk. Capital invested is not guaranteed. Past performance does not predict future results.</p>
              </div>
            </div>

            <button className="it-sheet-apply" onClick={() => setShowRiskInfo(false)}>
              Got it, understood
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          INVEST MODAL — original logic untouched
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
          }}
          balance={wallet.balance}
          onInvest={handleInvest}
        />
      )}

      {/* ═══════════════════════════════════════════
          ALL STYLES
      ═══════════════════════════════════════════ */}
      <style>{`
        /* ── Page layout ── */
        .it-page { min-height: 100vh; background: hsl(var(--background)); display: flex; flex-direction: column; }
        .it-body { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 14px 16px 32px; }

        /* ── Sticky header ── */
        .it-header {
          position: sticky; top: 0; z-index: 40;
          background: hsl(var(--background)/0.97);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid hsl(var(--border));
        }
        .it-header-inner {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 16px;
        }
        .it-header-sub   { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; }
        .it-header-title { font-size: 22px; font-weight: 900; color: hsl(var(--foreground)); letter-spacing: -0.4px; line-height: 1.15; }
        .it-header-right { display: flex; align-items: center; gap: 8px; }
        .it-wallet-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 9999px;
          background: hsl(var(--primary)/0.1); color: hsl(var(--primary));
          font-size: 12px; font-weight: 800; border: 1px solid hsl(var(--primary)/0.2);
        }
        .it-icon-btn {
          width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--foreground));
          transition: transform 0.15s; -webkit-tap-highlight-color: transparent;
        }
        .it-icon-btn:active { transform: scale(0.88); }

        /* ── Wallet hero card ── */
        .it-wallet-card {
          position: relative; overflow: hidden; border-radius: 22px;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.75) 100%);
          box-shadow: 0 10px 36px hsl(var(--primary)/0.35);
        }
        .it-wallet-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.1) 46%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.1) 54%, transparent 80%);
          background-size: 200% 100%; animation: itShimmer 4s ease-in-out infinite;
        }
        @keyframes itShimmer {
          0%        { background-position: 200% 0; opacity: 0; }
          10%       { opacity: 1; }
          50%       { background-position: -200% 0; opacity: 1; }
          60%,100%  { background-position: -200% 0; opacity: 0; }
        }
        .it-wallet-orb {
          pointer-events: none; position: absolute;
          top: -60px; right: -40px; width: 220px; height: 220px;
          border-radius: 9999px; background: rgba(255,255,255,0.1); filter: blur(50px);
        }
        .it-wallet-inner { position: relative; z-index: 1; padding: 20px; }
        .it-wallet-label  { font-size: 10px; color: rgba(255,255,255,0.65); font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .it-wallet-amount { font-size: 28px; font-weight: 900; color: white; letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
        .it-wallet-sub    { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 18px; }
        .it-wallet-stats  { display: flex; align-items: center; background: rgba(0,0,0,0.18); border-radius: 14px; padding: 12px 16px; }
        .it-wallet-stat   { flex: 1; text-align: center; }
        .it-wallet-stat-val { font-size: 16px; font-weight: 900; color: white; }
        .it-wallet-stat-lbl { font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
        .it-wallet-sep    { width: 1px; height: 28px; background: rgba(255,255,255,0.2); flex-shrink: 0; }

        /* ── Section header ── */
        .it-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .it-section-icon-wrap { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .it-section-title { font-size: 14px; font-weight: 800; color: hsl(var(--foreground)); flex: 1; }
        .it-see-all { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; padding: 4px; }

        /* ── Trending cards ── */
        .it-trending-track {
          display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 4px;
          scrollbar-width: none;
        }
        .it-trending-track::-webkit-scrollbar { display: none; }
        .it-trending-card {
          position: relative; overflow: hidden; flex-shrink: 0;
          width: 156px; border-radius: 20px; border: 1px solid hsl(var(--border));
          background: hsl(var(--card)); padding: 14px; text-align: left;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: transform 0.18s ease;
          display: flex; flex-direction: column; gap: 4px;
        }
        .it-trending-card:active { transform: scale(0.96); }
        .it-trending-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.07) 50%, transparent 75%);
          background-size: 200% 100%; animation: itShimmer 3.5s ease-in-out infinite;
        }
        .it-trending-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .it-trending-logo { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
        .it-trending-ticker { font-size: 13px; font-weight: 900; color: hsl(var(--foreground)); }
        .it-trending-flame { font-size: 16px; }
        .it-trending-name   { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .it-trending-sector { font-size: 10px; color: hsl(var(--muted-foreground)); margin-bottom: 4px; }
        .it-trending-cpr { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; margin-bottom: 10px; }
        .it-trending-invest-btn {
          width: 100%; padding: 7px; border-radius: 10px; border: none;
          color: white; font-size: 11px; font-weight: 800; cursor: pointer;
          -webkit-tap-highlight-color: transparent; position: relative; z-index: 1;
          transition: opacity 0.15s;
        }
        .it-trending-invest-btn:active { opacity: 0.75; }
        .it-up   { color: #22c55e; }
        .it-down { color: #ef4444; }

        /* ── Sector pills ── */
        .it-sectors-row { display: flex; gap: 7px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
        .it-sectors-row::-webkit-scrollbar { display: none; }
        .it-sector-pill {
          display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0;
          padding: 6px 13px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--foreground));
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s;
          white-space: nowrap;
        }
        .it-sector-pill:active { transform: scale(0.93); }

        /* ── Search ── */
        .it-search-wrap { position: relative; display: flex; align-items: center; }
        .it-search-icon { position: absolute; left: 13px; width: 16px; height: 16px; color: hsl(var(--muted-foreground)); pointer-events: none; }
        .it-search-input {
          width: 100%; height: 46px; border-radius: 14px;
          padding: 0 40px 0 42px;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          font-size: 13px; color: hsl(var(--foreground)); outline: none;
          transition: border-color 0.2s;
        }
        .it-search-input:focus { border-color: hsl(var(--primary)); }
        .it-search-input::placeholder { color: hsl(var(--muted-foreground)); }
        .it-search-clear {
          position: absolute; right: 11px; width: 24px; height: 24px;
          border-radius: 9999px; background: hsl(var(--muted)); border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--muted-foreground));
        }

        /* ── Toolbar ── */
        .it-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .it-toolbar-right { display: flex; align-items: center; gap: 6px; }
        .it-toolbar-count { font-size: 12px; color: hsl(var(--muted-foreground)); }
        .it-toolbar-num   { font-size: 15px; font-weight: 900; color: hsl(var(--foreground)); }
        .it-toolbar-query { color: hsl(var(--primary)); font-weight: 600; }
        .it-tool-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 12px; border-radius: 11px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          color: hsl(var(--foreground)); cursor: pointer;
          -webkit-tap-highlight-color: transparent; transition: all 0.15s;
        }
        .it-tool-btn:active { transform: scale(0.93); }
        .it-tool-btn--on  { border-color: hsl(var(--primary)); color: hsl(var(--primary)); background: hsl(var(--primary)/0.07); font-weight: 700; }
        .it-tool-btn--icon { padding: 7px; }

        /* Active filter tags */
        .it-filter-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .it-ftag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700;
          background: hsl(var(--primary)/0.1); color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary)/0.25);
        }
        .it-ftag button { background: none; border: none; font-size: 14px; cursor: pointer; line-height: 1; padding: 0; color: inherit; }
        .it-clear-all { font-size: 11px; font-weight: 700; color: hsl(var(--muted-foreground)); background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px; }

        /* ── Company list / grid ── */
        .it-company-list { display: flex; flex-direction: column; gap: 10px; }
        .it-company-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        /* ── Empty ── */
        .it-empty { text-align: center; padding: 40px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .it-empty-icon  { font-size: 48px; }
        .it-empty-title { font-size: 17px; font-weight: 800; color: hsl(var(--foreground)); }
        .it-empty-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); line-height: 1.5; max-width: 260px; }
        .it-empty-btn {
          display: inline-flex; align-items: center; padding: 10px 22px;
          border-radius: 13px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          font-size: 13px; font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 4px 14px hsl(var(--primary)/0.3); margin-top: 4px;
          transition: transform 0.15s;
        }
        .it-empty-btn:active { transform: scale(0.96); }

        /* ── Skeletons ── */
        .it-skeleton-hero { height: 160px; border-radius: 22px; background: hsl(var(--muted)); animation: itPulse 1.4s ease-in-out infinite; }
        .it-skeleton-card { height: 88px; border-radius: 16px; background: hsl(var(--muted)); animation: itPulse 1.4s ease-in-out infinite; }
        @keyframes itPulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }

        /* ── Overlay + bottom sheet ── */
        .it-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
          display: flex; align-items: flex-end;
          animation: itFade 0.18s ease;
        }
        @keyframes itFade { from{opacity:0;} to{opacity:1;} }
        .it-sheet {
          width: 100%; max-height: 90vh; overflow-y: auto;
          background: hsl(var(--card)); border-radius: 28px 28px 0 0;
          border-top: 1px solid hsl(var(--border));
          padding: 10px 18px 28px;
          animation: itSlide 0.25s cubic-bezier(0.34,1.15,0.64,1);
        }
        @keyframes itSlide { from{transform:translateY(100%);} to{transform:translateY(0);} }
        .it-sheet-handle { width: 40px; height: 4px; border-radius: 9999px; background: hsl(var(--muted)); margin: 0 auto 18px; }
        .it-sheet-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .it-sheet-icon { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .it-sheet-title { font-size: 16px; font-weight: 900; color: hsl(var(--foreground)); }
        .it-sheet-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .it-sheet-close { margin-left: auto; width: 32px; height: 32px; border-radius: 10px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: hsl(var(--foreground)); flex-shrink: 0; }

        /* ── Filter modal internals ── */
        .it-filter-section { margin-bottom: 22px; }
        .it-filter-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground)); margin-bottom: 10px; }
        .it-filter-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .it-filter-info-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: hsl(var(--primary)); background: none; border: none; cursor: pointer; }
        .it-filter-sector-grid { display: flex; flex-wrap: wrap; gap: 7px; }
        .it-filter-sector-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          color: hsl(var(--foreground)); cursor: pointer; transition: all 0.15s;
        }
        .it-filter-sector-btn--on { font-weight: 700; }

        /* Risk buttons */
        .it-risk-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
        .it-risk-btn {
          display: flex; align-items: center; justify-content: center; gap: 5px;
          padding: 10px 6px; border-radius: 13px; font-size: 12px; font-weight: 600;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          color: hsl(var(--foreground)); cursor: pointer; transition: all 0.15s;
        }
        .it-risk-btn--on { font-weight: 800; }

        /* Trending toggle */
        .it-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-radius: 16px;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent; width: 100;
          transition: all 0.15s;
        }
        .it-toggle-row--on { border-color: hsl(var(--primary)/0.4); background: hsl(var(--primary)/0.05); }
        .it-toggle-left { display: flex; align-items: center; gap: 10px; }
        .it-toggle-title { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); }
        .it-toggle-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .it-toggle-switch {
          width: 44px; height: 24px; border-radius: 9999px; background: hsl(var(--muted));
          position: relative; transition: background 0.2s; flex-shrink: 0;
        }
        .it-toggle-switch--on { background: hsl(var(--primary)); }
        .it-toggle-thumb {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 9999px; background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s cubic-bezier(0.34,1.3,0.64,1);
        }
        .it-toggle-switch--on .it-toggle-thumb { transform: translateX(20px); }

        /* Sheet footer */
        .it-sheet-footer { display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid hsl(var(--border)); margin-top: 8px; }
        .it-sheet-reset {
          flex: 0 0 88px; height: 50px; border-radius: 16px;
          border: 1.5px solid hsl(var(--border)); background: none;
          font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); cursor: pointer;
        }
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
          display: flex; align-items: center; gap: 12px; padding: 14px 16px;
          border-radius: 16px; border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent; transition: all 0.15s; width: 100%;
          text-align: left;
        }
        .it-sort-opt--on { border-color: hsl(var(--primary)/0.4); background: hsl(var(--primary)/0.06); }
        .it-sort-opt-label { font-size: 14px; font-weight: 700; color: hsl(var(--foreground)); }
        .it-sort-opt-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; }
        .it-sort-check {
          width: 26px; height: 26px; border-radius: 9999px; flex-shrink: 0;
          background: hsl(var(--primary)); display: flex; align-items: center; justify-content: center;
          color: hsl(var(--primary-foreground));
        }

        /* Risk info cards */
        .it-risk-info-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .it-risk-info-card { padding: 16px; border-radius: 16px; border: 1px solid; }
        .it-risk-info-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .it-risk-info-label { font-size: 14px; font-weight: 800; }
        .it-risk-info-body { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.6; }
        .it-risk-disclaimer {
          display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px;
          border-radius: 14px; background: rgba(245,158,11,0.07);
          border: 1px solid rgba(245,158,11,0.2);
          font-size: 11px; color: hsl(var(--muted-foreground)); line-height: 1.5;
        }
      `}</style>
    </div>
  );
};
