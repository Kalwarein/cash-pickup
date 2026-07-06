import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Users, Activity, Flame, Ticket,
  AlertTriangle, Coins, Pickaxe, ChevronRight, Shield,
  ArrowUpRight, ArrowDownRight, Eye, EyeOff, Award,
  CheckCircle2, Sparkles, Wallet, BarChart3, RefreshCw,
  Info, Lock, Unlock, Settings
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { useCPR } from '@/hooks/useCPR';
import { useCompanies } from '@/hooks/useCompanies';
import { useInvestments } from '@/hooks/useInvestments';
import { CPRIndicator } from '@/components/CPRIndicator';
import { InvestmentProgressBar } from '@/components/InvestmentProgressBar';
import { RiskWarning } from '@/components/RiskWarning';
import { PromoCodeMarketplace } from '@/components/PromoCodeMarketplace';
import { cn } from '@/lib/utils';
import { formatSLE, sle } from '@/lib/currency';

/* ─────────────────────────────────────────────────────────
   SVG sparkline — pure inline, no deps
──────────────────────────────────────────────────────────── */
const Sparkline = ({ up }: { up: boolean }) => {
  const pts = [0, 30, 10, 55, 25, 45, 60, 35, 70, 20, 90, 50, 110, 10, 130, 40, 150, 5];
  const pairs: string[] = [];
  for (let i = 0; i < pts.length; i += 2) pairs.push(`${pts[i]},${pts[i + 1]}`);
  const polyline = pairs.join(' ');
  const color = up ? '#22c55e' : '#ef4444';
  return (
    <svg width="80" height="32" viewBox="0 0 150 70" preserveAspectRatio="none" fill="none">
      <polyline points={polyline} stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────
   Donut ring — SVG, no libs
──────────────────────────────────────────────────────────── */
const DonutRing = ({ pct }: { pct: number }) => {
  const R = 30, C = 2 * Math.PI * R;
  const filled = Math.max(0, Math.min(pct, 100));
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={R} fill="none"
        stroke="hsl(var(--primary))" strokeWidth="8"
        strokeDasharray={`${(filled / 100) * C} ${C}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.34,1.1,0.64,1)' }}
      />
      <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="800" fill="hsl(var(--foreground))">
        {Math.round(filled)}%
      </text>
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export const HomeTab = () => {
  const navigate = useNavigate();
  const { topPerformers, averageCPR } = useCPR();
  const { companies } = useCompanies();
  const { investments, completedInvestments } = useInvestments();

  const [showPromo, setShowPromo]         = useState(false);
  const [hidden, setHidden]               = useState(false);
  const [showRisk, setShowRisk]           = useState(false);
  const [showCprInfo, setShowCprInfo]     = useState(false);

  /* ── Portfolio maths ── */
  const totalInvested     = investments.reduce((s, i) => s + i.amount, 0);
  const totalProfitLoss   = investments.reduce((s, i) => s + i.profit_loss, 0);
  const totalValue        = investments.reduce((s, i) => s + i.current_value, 0);
  const completedProfit   = completedInvestments.reduce((s, i) => s + (i.final_profit_loss || 0), 0);
  const returnPct         = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;
  const isUp              = totalProfitLoss >= 0;
  const allocPct          = totalInvested > 0 ? Math.min((totalValue / (totalInvested * 2)) * 100, 100) : 0;

  /* ── Market status ── */
  const mkt =
    averageCPR >= 5   ? { label: 'Bullish',  c: '#22c55e', bg: 'rgba(34,197,94,0.14)'  } :
    averageCPR >= -10 ? { label: 'Mixed',    c: '#f59e0b', bg: 'rgba(245,158,11,0.14)' } :
                        { label: 'Bearish',  c: '#ef4444', bg: 'rgba(239,68,68,0.14)'  };

  const mask = (val: string) => hidden ? '•••••' : val;

  /* ── Quick action tiles ── */
  const actions = [
    { label: 'Invest',    icon: TrendingUp, c: '#6366f1', bg: 'rgba(99,102,241,0.1)',  path: '/invest'   },
    { label: 'Withdraw',  icon: Wallet,     c: '#10b981', bg: 'rgba(16,185,129,0.1)',  path: '/wallet'   },
    { label: 'Returns',   icon: BarChart3,  c: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  path: '/wallet'   },
    { label: 'History',   icon: RefreshCw,  c: '#ec4899', bg: 'rgba(236,72,153,0.1)',  path: '/payments' },
  ];

  return (
    <div className="cp-page">

      {/* ════════════════════════════════════════════
          STICKY HEADER — edge to edge
      ════════════════════════════════════════════ */}
      <header className="cp-header">
        <div className="cp-header-inner">
          {/* Left: logo + title */}
          <div className="cp-header-brand">
            <div className="cp-logo-ring">
              <TrendingUp className="cp-logo-icon" />
            </div>
            <div>
              <p className="cp-header-sub"></p>
              <h1 className="cp-header-title">Cash Pickup</h1>
            </div>
          </div>

          {/* Right: actions */}
          <div className="cp-header-actions">
            <div className="cp-market-chip" style={{ background: mkt.bg, color: mkt.c }}>
              <span className="cp-market-pulse" style={{ background: mkt.c }} />
              {mkt.label}
            </div>
            <button className="cp-hdr-btn cp-hdr-btn--bell" onClick={() => setShowPromo(true)}>
              <Ticket className="cp-hdr-icon" />
            </button>
            <button className="cp-hdr-btn" onClick={() => navigate('/mine')}>
              <Pickaxe className="cp-hdr-icon" />
            </button>
            <button className="cp-hdr-btn" onClick={() => navigate('/settings')} aria-label="Settings">
              <Settings className="cp-hdr-icon" />
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          PORTFOLIO HERO — edge to edge, full bleed
      ════════════════════════════════════════════ */}
      <section className="cp-hero">
        {/* gradient orbs */}
        <span className="cp-hero-orb cp-hero-orb--1" />
        <span className="cp-hero-orb cp-hero-orb--2" />
        <span className="cp-hero-shimmer" />

        <div className="cp-hero-inner">
          {/* balance */}
          <div className="cp-hero-balance-row">
            <div>
              <p className="cp-hero-label">Total Portfolio Value</p>
              <div className="cp-hero-amount-row">
                <p className="cp-hero-amount">{mask(sle(totalValue || 0))}</p>
                <button className="cp-vis-btn" onClick={() => setHidden(h => !h)}>
                  {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              <div className={cn('cp-hero-return', isUp ? 'cp-up' : 'cp-down')}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{isUp ? '+' : ''}{returnPct.toFixed(2)}% overall return</span>
              </div>
            </div>
            <Sparkline up={isUp} />
          </div>

          {/* 4-stat strip */}
          <div className="cp-hero-strip">
            <div className="cp-hero-stat">
              <p className="cp-hero-stat-lbl">Capital</p>
              <p className="cp-hero-stat-val">{mask(sle(totalInvested))}</p>
            </div>
            <div className="cp-hero-sep" />
            <div className="cp-hero-stat">
              <p className="cp-hero-stat-lbl">Profit / Loss</p>
              <p className={cn('cp-hero-stat-val', isUp ? 'cp-up' : 'cp-down')}>
                {mask(`${isUp ? '+' : ''}${sle(totalProfitLoss)}`)}
              </p>
            </div>
            <div className="cp-hero-sep" />
            <div className="cp-hero-stat">
              <p className="cp-hero-stat-lbl">Active</p>
              <p className="cp-hero-stat-val">{investments.length}</p>
            </div>
            <div className="cp-hero-sep" />
            <div className="cp-hero-stat">
              <p className="cp-hero-stat-lbl">Closed</p>
              <p className="cp-hero-stat-val">{completedInvestments.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* padded area below the hero */}
      <div className="cp-body">

        {/* ════════════════════════════════════════════
            QUICK ACTIONS
        ════════════════════════════════════════════ */}
        <div className="cp-quick-grid">
          {actions.map(({ label, icon: Icon, c, bg, path }) => (
            <button key={label} className="cp-qa-tile" onClick={() => navigate(path)}>
              <div className="cp-qa-icon-wrap" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color: c }} strokeWidth={1.8} />
              </div>
              <span className="cp-qa-lbl">{label}</span>
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════
            CASH MINER PROMO — tap-to-earn banner
        ════════════════════════════════════════════ */}
        <button className="cp-earn-banner" onClick={() => navigate('/mine')}>
          <span className="cp-earn-shimmer" />
          <span className="cp-earn-orb" />
          <div className="cp-earn-icon-wrap">
            <Pickaxe className="w-6 h-6" />
          </div>
          <div className="cp-earn-copy">
            <p className="cp-earn-title">
              Cash Miner <span className="cp-earn-badge">MINE NOW</span>
            </p>
            <p className="cp-earn-sub">
              Tap to mine coins & boost your leverage power
            </p>
          </div>
          <ChevronRight className="w-4 h-4 cp-earn-chev" />
        </button>

        {/* ════════════════════════════════════════════
            CPR SECTION
        ════════════════════════════════════════════ */}
        <div className="cp-card">
          <div className="cp-card-header">
            <div className="cp-card-icon-wrap" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Activity className="w-4 h-4" style={{ color: '#6366f1' }} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="cp-card-title">Platform CPR</p>
              <p className="cp-card-sub">Current Profit Rate — determines your returns at maturity</p>
            </div>
            <button className="cp-info-btn" onClick={() => setShowCprInfo(true)}>
              <Info className="w-4 h-4" />
            </button>
          </div>

          <div className="cp-cpr-body">
            <div>
              <p className={cn('cp-cpr-big', averageCPR >= 0 ? 'cp-up' : 'cp-down')}>
                {averageCPR >= 0 ? '+' : ''}{averageCPR.toFixed(1)}%
              </p>
              <p className="cp-cpr-status" style={{ color: mkt.c }}>
                {mkt.label} Market
              </p>
            </div>
            <CPRIndicator value={averageCPR} size="lg" showLabel />
          </div>

          <div className="cp-cpr-alert">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p>Negative CPR at maturity may reduce your capital. Always review before investing.</p>
            <button className="cp-link-btn" onClick={() => setShowCprInfo(true)}>Details</button>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            ACTIVE INVESTMENTS
        ════════════════════════════════════════════ */}
        {investments.length > 0 && (
          <div className="cp-card">
            <div className="cp-card-header">
              <div className="cp-card-icon-wrap" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <TrendingUp className="w-4 h-4" style={{ color: '#10b981' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="cp-card-title">Active Investments</p>
                <p className="cp-card-sub">{investments.length} open positions</p>
              </div>
              <button className="cp-see-all" onClick={() => navigate('/wallet')}>
                All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Allocation donut + numbers */}
            <div className="cp-alloc-row">
              <DonutRing pct={allocPct} />
              <div className="cp-alloc-stats">
                <div className="cp-alloc-line">
                  <span className="cp-alloc-dot" style={{ background: 'hsl(var(--primary))' }} />
                  <span className="cp-alloc-lbl">Capital invested</span>
                  <span className="cp-alloc-val">{mask(sle(totalInvested))}</span>
                </div>
                <div className="cp-alloc-line">
                  <span className="cp-alloc-dot" style={{ background: isUp ? '#22c55e' : '#ef4444' }} />
                  <span className="cp-alloc-lbl">Est. current value</span>
                  <span className={cn('cp-alloc-val', isUp ? 'cp-up' : 'cp-down')}>{mask(sle(totalValue))}</span>
                </div>
                <div className="cp-alloc-line">
                  <span className="cp-alloc-dot" style={{ background: '#f59e0b' }} />
                  <span className="cp-alloc-lbl">Total return</span>
                  <span className={cn('cp-alloc-val', isUp ? 'cp-up' : 'cp-down')}>
                    {isUp ? '+' : ''}{returnPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Position cards */}
            <div className="cp-positions">
              {investments.slice(0, 4).map(inv => {
                const pct = inv.amount > 0 ? (inv.profit_loss / inv.amount) * 100 : 0;
                const posUp = inv.profit_loss >= 0;
                return (
                  <div key={inv.id} className="cp-position">
                    <div className="cp-pos-avatar" style={{
                      background: posUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: posUp ? '#22c55e' : '#ef4444',
                    }}>
                      {inv.company_ticker?.slice(0, 2) || 'IN'}
                    </div>
                    <div className="cp-pos-info">
                      <div className="cp-pos-top">
                        <p className="cp-pos-name">{inv.company_name}</p>
                        <p className="cp-pos-value">{mask(sle(inv.current_value))}</p>
                      </div>
                      <div className="cp-pos-bot">
                        <p className="cp-pos-ticker">{inv.company_ticker}</p>
                        <div className={cn('cp-pos-change', posUp ? 'cp-up' : 'cp-down')}>
                          {posUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {posUp ? '+' : ''}{pct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="cp-pos-progress">
                        <InvestmentProgressBar
                          maturityDate={inv.maturity_date}
                          maturityDays={inv.maturity_days}
                          createdAt={inv.created_at}
                          companyName={inv.company_name || ''}
                          amount={inv.amount}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            COMPLETED INVESTMENTS
        ════════════════════════════════════════════ */}
        {completedInvestments.length > 0 && (
          <div className="cp-card">
            <div className="cp-card-header">
              <div className="cp-card-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Award className="w-4 h-4" style={{ color: '#f59e0b' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="cp-card-title">Completed Investments</p>
                <p className="cp-card-sub">{completedInvestments.length} matured positions</p>
              </div>
              <span className={cn('cp-net-tag', completedProfit >= 0 ? 'cp-net-up' : 'cp-net-down')}>
                {completedProfit >= 0 ? '+' : ''}{sle(completedProfit)}
              </span>
            </div>

            <div className="cp-completed-list">
              {completedInvestments.slice(0, 3).map(inv => {
                const pl = inv.final_profit_loss || 0;
                const posUp = pl >= 0;
                return (
                  <div key={inv.id} className="cp-completed-row">
                    <div className="cp-completed-icon"
                      style={{ background: posUp ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: posUp ? '#22c55e' : '#ef4444' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="cp-completed-name">{inv.company_name}</p>
                      <p className="cp-completed-tag">Investment matured</p>
                    </div>
                    <p className={cn('cp-completed-pl', posUp ? 'cp-up' : 'cp-down')}>
                      {posUp ? '+' : ''}{sle(pl)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            PLATFORM STATS
        ════════════════════════════════════════════ */}
        <div className="cp-card">
          <div className="cp-card-header">
            <div className="cp-card-icon-wrap" style={{ background: 'rgba(139,92,246,0.1)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#8b5cf6' }} strokeWidth={2} />
            </div>
            <p className="cp-card-title">Platform Overview</p>
          </div>
          <div className="cp-stats-grid">
            <StatCard label="Total Investors" value="2,847" icon={<Users className="w-4 h-4" />} />
            <StatCard label="Open Positions" value={investments.length.toString()} icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard label="Your Portfolio" value={`${totalInvested.toFixed(0)} SLE`}
              change={totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0} />
            <StatCard label="Market Activity" value="High" icon={<Activity className="w-4 h-4" />} />
          </div>
        </div>

        {/* ════════════════════════════════════════════
            TOP PERFORMERS
        ════════════════════════════════════════════ */}
        {topPerformers.length > 0 && (
          <div className="cp-card">
            <div className="cp-card-header">
              <div className="cp-card-icon-wrap" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Flame className="w-4 h-4" style={{ color: '#ef4444' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="cp-card-title">Top Performers</p>
                <p className="cp-card-sub">Highest CPR returns today</p>
              </div>
            </div>

            <div className="cp-performers">
              {topPerformers.slice(0, 4).map((co, i) => (
                <div key={co.id} className="cp-performer">
                  <p className="cp-performer-rank">#{i + 1}</p>
                  <div className="cp-performer-logo">
                    <span className="cp-performer-ticker">{co.ticker.slice(0, 2)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="cp-performer-name">{co.name}</p>
                    <p className="cp-performer-sector">{co.sector}</p>
                  </div>
                  <CPRIndicator value={co.cpr_today} size="md" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            RISK DISCLOSURE BANNER
        ════════════════════════════════════════════ */}
        <button className="cp-risk-banner" onClick={() => setShowRisk(true)}>
          <span className="cp-risk-shimmer" />
          <Shield className="w-5 h-5 text-amber-400 relative z-10 flex-shrink-0" strokeWidth={1.8} />
          <div className="relative z-10 flex-1 text-left">
            <p className="cp-risk-title">Investment Risk Notice</p>
            <p className="cp-risk-body">
              Capital at risk. Returns not guaranteed. Read full disclosure before investing.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 relative z-10 flex-shrink-0" />
        </button>

      </div>{/* end cp-body */}

      {/* ════════════════════════════════════════════
          CPR INFO MODAL
      ════════════════════════════════════════════ */}
      {showCprInfo && (
        <div className="cp-overlay" onClick={() => setShowCprInfo(false)}>
          <div className="cp-sheet" onClick={e => e.stopPropagation()}>
            <div className="cp-sheet-handle" />
            <div className="cp-sheet-head">
              <div className="cp-sheet-icon-wrap" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Activity className="w-5 h-5" style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="cp-sheet-title">Understanding CPR</p>
                <p className="cp-sheet-sub">How your returns are calculated</p>
              </div>
              <button className="cp-sheet-close" onClick={() => setShowCprInfo(false)}>✕</button>
            </div>

            <div className="cp-sheet-rows">
              {[
                { icon: '📈', label: 'Positive CPR (≥ 5%)', desc: 'Market is performing well. Your investment grows at or above the CPR rate at maturity. Best time to invest more.', color: '#22c55e' },
                { icon: '⚖️', label: 'Mixed CPR (−10% to 5%)', desc: 'Market is volatile. Returns vary and may be lower than expected. Consider smaller positions.', color: '#f59e0b' },
                { icon: '📉', label: 'Negative CPR (< −10%)', desc: 'Market is underperforming. You risk losing a portion of your invested capital when your investment matures.', color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="cp-info-row">
                  <span className="cp-info-emoji">{item.icon}</span>
                  <div className="flex-1">
                    <p className="cp-info-label" style={{ color: item.color }}>{item.label}</p>
                    <p className="cp-info-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="cp-sheet-cta" onClick={() => setShowCprInfo(false)}>
              Understood
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          RISK DETAIL MODAL
      ════════════════════════════════════════════ */}
      {showRisk && (
        <div className="cp-overlay" onClick={() => setShowRisk(false)}>
          <div className="cp-sheet" onClick={e => e.stopPropagation()}>
            <div className="cp-sheet-handle" />
            <div className="cp-sheet-head">
              <div className="cp-sheet-icon-wrap" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="cp-sheet-title">Risk Disclosure</p>
                <p className="cp-sheet-sub">Read before you invest</p>
              </div>
              <button className="cp-sheet-close" onClick={() => setShowRisk(false)}>✕</button>
            </div>

            <div className="cp-sheet-rows">
              {[
                { icon: '⚠️', label: 'Capital at Risk', desc: 'Investments can decrease in value. You may receive back less than the amount you invested.' },
                { icon: '📊', label: 'CPR-Linked Returns', desc: 'Your final return is directly tied to the Current Profit Rate at the time your investment matures.' },
                { icon: '🔒', label: 'Lock-in Period', desc: 'Funds are locked for the selected duration. Early withdrawals are subject to terms and fees.' },
                { icon: '📋', label: 'No Guaranteed Returns', desc: 'Past performance of any company or the platform does not guarantee future results.' },
              ].map(item => (
                <div key={item.label} className="cp-info-row">
                  <span className="cp-info-emoji">{item.icon}</span>
                  <div className="flex-1">
                    <p className="cp-info-label">{item.label}</p>
                    <p className="cp-info-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="cp-sheet-cta" onClick={() => setShowRisk(false)}>
              I Understand, Continue
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PROMO MODAL
      ════════════════════════════════════════════ */}
      <PromoCodeMarketplace isOpen={showPromo} onClose={() => setShowPromo(false)} />

      {/* ════════════════════════════════════════════
          ALL STYLES
      ════════════════════════════════════════════ */}
      <style>{`
        /* ── Layout ── */
        .cp-page {
          min-height: 100vh;
          background: hsl(var(--background));
          display: flex;
          flex-direction: column;
        }
        .cp-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 14px 16px 32px;
        }

        /* ── Header ── */
        .cp-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: hsl(var(--background)/0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid hsl(var(--border));
        }
        .cp-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 16px;
        }
        .cp-header-brand { display: flex; align-items: center; gap: 10px; }
        .cp-logo-ring {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          background: hsl(var(--primary));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px hsl(var(--primary)/0.4);
        }
        .cp-logo-icon { width: 18px; height: 18px; color: hsl(var(--primary-foreground)); }
        .cp-header-sub   { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .cp-header-title { font-size: 18px; font-weight: 900; color: hsl(var(--foreground)); line-height: 1.15; letter-spacing: -0.3px; }
        .cp-header-actions { display: flex; align-items: center; gap: 6px; }

        .cp-market-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 9999px;
          font-size: 11px; font-weight: 800; letter-spacing: 0.02em;
        }
        .cp-market-pulse {
          width: 6px; height: 6px; border-radius: 9999px;
          animation: cpPulse 2s ease-in-out infinite;
        }
        @keyframes cpPulse { 0%,100%{opacity:1;} 50%{opacity:0.35;} }

        .cp-hdr-btn {
          position: relative;
          width: 36px; height: 36px; border-radius: 11px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--foreground));
          transition: transform 0.15s; -webkit-tap-highlight-color: transparent;
        }
        .cp-hdr-btn:active { transform: scale(0.88); }
        .cp-hdr-icon { width: 16px; height: 16px; }

        /* ── Hero — full bleed ── */
        .cp-hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(160deg,
            hsl(var(--primary)) 0%,
            hsl(var(--primary)/0.85) 50%,
            hsl(var(--primary)/0.6) 100%
          );
          padding: 28px 20px 24px;
        }
        .cp-hero-orb {
          pointer-events: none;
          position: absolute;
          border-radius: 9999px;
          filter: blur(60px);
        }
        .cp-hero-orb--1 {
          width: 280px; height: 280px;
          top: -100px; right: -80px;
          background: rgba(255,255,255,0.12);
        }
        .cp-hero-orb--2 {
          width: 180px; height: 180px;
          bottom: -60px; left: -40px;
          background: rgba(255,255,255,0.06);
        }
        .cp-hero-shimmer {
          pointer-events: none;
          position: absolute; inset: 0;
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(255,255,255,0.08) 45%,
            rgba(255,255,255,0.15) 50%,
            rgba(255,255,255,0.08) 55%,
            transparent 80%
          );
          background-size: 200% 100%;
          animation: cpShimmer 5s ease-in-out infinite;
        }
        @keyframes cpShimmer {
          0%        { background-position: 200% 0; opacity: 0; }
          10%       { opacity: 1; }
          50%       { background-position: -200% 0; opacity: 1; }
          60%,100%  { background-position: -200% 0; opacity: 0; }
        }
        .cp-hero-inner { position: relative; z-index: 1; }
        .cp-hero-balance-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 12px;
          margin-bottom: 22px;
        }
        .cp-hero-label {
          font-size: 11px; color: rgba(255,255,255,0.65);
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em;
          margin-bottom: 6px;
        }
        .cp-hero-amount-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .cp-hero-amount {
          font-size: 32px; font-weight: 900; color: white;
          letter-spacing: -1.5px; line-height: 1;
        }
        .cp-vis-btn {
          background: rgba(255,255,255,0.18); border: none; border-radius: 8px;
          padding: 5px; display: flex; align-items: center; cursor: pointer;
          color: rgba(255,255,255,0.8); transition: background 0.15s;
        }
        .cp-vis-btn:active { background: rgba(255,255,255,0.3); }
        .cp-hero-return {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 700;
          background: rgba(0,0,0,0.15); padding: 4px 10px; border-radius: 9999px;
        }
        .cp-hero-strip {
          display: flex; align-items: center;
          background: rgba(0,0,0,0.2); border-radius: 16px;
          padding: 14px 16px;
        }
        .cp-hero-stat { flex: 1; text-align: center; }
        .cp-hero-stat-lbl { font-size: 9px; color: rgba(255,255,255,0.55); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
        .cp-hero-stat-val { font-size: 14px; font-weight: 800; color: white; margin-top: 3px; }
        .cp-hero-sep { width: 1px; height: 30px; background: rgba(255,255,255,0.18); flex-shrink: 0; }

        /* colour helpers */
        .cp-up   { color: #22c55e; }
        .cp-down { color: #ef4444; }

        /* ── Cash Miner promo banner ── */
        .cp-earn-banner {
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: 20px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%);
          border: 1px solid rgba(245,158,11,0.4);
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          width: 100%; text-align: left;
          box-shadow: 0 10px 26px rgba(245,158,11,0.28);
          transition: transform 0.15s;
        }
        .cp-earn-banner:active { transform: scale(0.98); }
        .cp-earn-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.28) 50%, transparent 80%);
          background-size: 200% 100%; animation: cpShimmer 4s ease-in-out infinite;
        }
        .cp-earn-orb {
          pointer-events: none; position: absolute;
          width: 130px; height: 130px; border-radius: 9999px;
          background: rgba(255,255,255,0.16); filter: blur(32px);
          top: -46px; right: -24px;
        }
        .cp-earn-icon-wrap {
          position: relative; z-index: 1; flex-shrink: 0;
          width: 46px; height: 46px; border-radius: 14px;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .cp-earn-copy { position: relative; z-index: 1; flex: 1; min-width: 0; }
        .cp-earn-title {
          font-size: 14px; font-weight: 900; color: white;
          display: flex; align-items: center; gap: 6px;
        }
        .cp-earn-badge {
          font-size: 9px; font-weight: 800; letter-spacing: 0.04em;
          background: rgba(255,255,255,0.25); color: white;
          padding: 2px 6px; border-radius: 9999px; white-space: nowrap;
        }
        .cp-earn-sub {
          font-size: 11px; color: rgba(255,255,255,0.9);
          margin-top: 3px; line-height: 1.4;
        }
        .cp-earn-chev { position: relative; z-index: 1; color: white; flex-shrink: 0; }

        /* ── Quick Actions ── */
        .cp-quick-grid {
          display: grid; grid-template-columns: repeat(4,1fr); gap: 10px;
        }
        .cp-qa-tile {
          display: flex; flex-direction: column; align-items: center; gap: 7px;
          padding: 14px 8px; border-radius: 18px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: all 0.15s;
        }
        .cp-qa-tile:active { transform: scale(0.93); background: hsl(var(--muted)); }
        .cp-qa-icon-wrap {
          width: 44px; height: 44px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .cp-qa-lbl { font-size: 11px; font-weight: 700; color: hsl(var(--foreground)); }

        /* ── Cards ── */
        .cp-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 22px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }
        .cp-card-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
        }
        .cp-card-icon-wrap {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cp-card-title { font-size: 15px; font-weight: 800; color: hsl(var(--foreground)); line-height: 1.2; }
        .cp-card-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .cp-see-all {
          display: inline-flex; align-items: center; gap: 2px;
          font-size: 11px; font-weight: 700; color: hsl(var(--primary));
          background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px;
        }
        .cp-info-btn {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--muted-foreground));
        }

        /* ── CPR block ── */
        .cp-cpr-body { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .cp-cpr-big { font-size: 36px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
        .cp-cpr-status { font-size: 12px; font-weight: 700; margin-top: 4px; }
        .cp-cpr-alert {
          display: flex; align-items: flex-start; gap: 7px;
          padding: 10px 12px; border-radius: 12px;
          background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.2);
          font-size: 11px; color: hsl(var(--muted-foreground)); line-height: 1.5;
        }
        .cp-link-btn { color: hsl(var(--primary)); font-weight: 700; background: none; border: none; cursor: pointer; font-size: 11px; flex-shrink: 0; padding: 0; }

        /* ── Allocation row ── */
        .cp-alloc-row { display: flex; align-items: center; gap: 16px; background: hsl(var(--muted)/0.4); border-radius: 16px; padding: 14px; margin-bottom: 14px; }
        .cp-alloc-stats { flex: 1; display: flex; flex-direction: column; gap: 9px; }
        .cp-alloc-line { display: flex; align-items: center; gap: 7px; }
        .cp-alloc-dot  { width: 7px; height: 7px; border-radius: 9999px; flex-shrink: 0; }
        .cp-alloc-lbl  { font-size: 11px; color: hsl(var(--muted-foreground)); flex: 1; }
        .cp-alloc-val  { font-size: 12px; font-weight: 800; color: hsl(var(--foreground)); }

        /* ── Positions ── */
        .cp-positions { display: flex; flex-direction: column; gap: 10px; }
        .cp-position {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 16px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--background));
          transition: transform 0.15s;
        }
        .cp-position:active { transform: scale(0.98); }
        .cp-pos-avatar {
          width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 900;
        }
        .cp-pos-info { flex: 1; min-width: 0; }
        .cp-pos-top  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
        .cp-pos-bot  { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .cp-pos-name   { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 160px; }
        .cp-pos-ticker { font-size: 10px; color: hsl(var(--muted-foreground)); font-weight: 600; }
        .cp-pos-value  { font-size: 14px; font-weight: 800; color: hsl(var(--foreground)); }
        .cp-pos-change { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; font-weight: 700; }
        .cp-pos-progress { margin-top: 2px; }

        /* ── Completed ── */
        .cp-completed-list { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
        .cp-completed-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 14px;
          background: hsl(var(--muted)/0.35);
        }
        .cp-completed-icon {
          width: 30px; height: 30px; border-radius: 9999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .cp-completed-name { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); }
        .cp-completed-tag  { font-size: 10px; color: hsl(var(--muted-foreground)); margin-top: 1px; }
        .cp-completed-pl   { font-size: 13px; font-weight: 800; flex-shrink: 0; }
        .cp-net-tag { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 800; }
        .cp-net-up   { background: rgba(34,197,94,0.1);  color: #22c55e; }
        .cp-net-down { background: rgba(239,68,68,0.1); color: #ef4444; }

        /* ── Stats grid ── */
        .cp-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }

        /* ── Performers ── */
        .cp-performers { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
        .cp-performer {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 16px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--background));
          transition: transform 0.15s;
        }
        .cp-performer:active { transform: scale(0.98); }
        .cp-performer-rank { font-size: 11px; font-weight: 800; color: hsl(var(--muted-foreground)); min-width: 22px; }
        .cp-performer-logo {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7));
          display: flex; align-items: center; justify-content: center;
        }
        .cp-performer-ticker { font-size: 12px; font-weight: 900; color: hsl(var(--primary-foreground)); }
        .cp-performer-name   { font-size: 13px; font-weight: 700; color: hsl(var(--foreground)); }
        .cp-performer-sector { font-size: 10px; color: hsl(var(--muted-foreground)); margin-top: 1px; }

        /* ── Risk banner ── */
        .cp-risk-banner {
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 12px;
          padding: 16px 16px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05));
          border: 1px solid rgba(245,158,11,0.25);
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          width: 100%; text-align: left;
        }
        .cp-risk-shimmer {
          pointer-events: none; position: absolute; inset: 0;
          background: linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.06) 50%, transparent 80%);
          background-size: 200% 100%; animation: cpShimmer 5s ease-in-out infinite;
        }
        .cp-risk-title { font-size: 13px; font-weight: 800; color: hsl(var(--foreground)); }
        .cp-risk-body  { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; line-height: 1.5; }

        /* ── Bottom sheets / modals ── */
        .cp-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
          display: flex; align-items: flex-end;
          animation: cpFade 0.18s ease;
        }
        @keyframes cpFade { from { opacity: 0; } to { opacity: 1; } }

        .cp-sheet {
          width: 100%; max-height: 88vh; overflow-y: auto;
          background: hsl(var(--card));
          border-radius: 28px 28px 0 0;
          border-top: 1px solid hsl(var(--border));
          padding: 12px 18px 28px;
          animation: cpSlide 0.25s cubic-bezier(0.34,1.15,0.64,1);
        }
        @keyframes cpSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .cp-sheet-handle {
          width: 40px; height: 4px; border-radius: 9999px;
          background: hsl(var(--muted)); margin: 0 auto 18px;
        }
        .cp-sheet-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .cp-sheet-icon-wrap { width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .cp-sheet-title { font-size: 16px; font-weight: 900; color: hsl(var(--foreground)); line-height: 1.2; }
        .cp-sheet-sub   { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; }
        .cp-sheet-close {
          margin-left: auto; width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; color: hsl(var(--foreground));
          flex-shrink: 0;
        }
        .cp-sheet-rows { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .cp-info-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 14px; border-radius: 16px; background: hsl(var(--muted)/0.4);
        }
        .cp-info-emoji { font-size: 22px; flex-shrink: 0; line-height: 1.3; }
        .cp-info-label { font-size: 13px; font-weight: 800; color: hsl(var(--foreground)); margin-bottom: 4px; }
        .cp-info-desc  { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.6; }

        .cp-sheet-cta {
          width: 100%; height: 50px; border-radius: 16px; border: none;
          background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
          font-size: 15px; font-weight: 800; cursor: pointer; letter-spacing: 0.01em;
          box-shadow: 0 6px 20px hsl(var(--primary)/0.35);
          transition: transform 0.15s;
        }
        .cp-sheet-cta:active { transform: scale(0.97); }
      `}</style>
    </div>
  );
};
