import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Gauge, Zap, Wallet, Flame, Pickaxe, Lock, Check,
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useTapEarn } from '@/hooks/useTapEarn';
import { MineButton } from '@/components/mine/MineButton';
import { AnimatedNumber } from '@/components/tap/AnimatedNumber';
import {
  LEVERAGE, rewardPerTap, leverageMult, formatUnits, HeatLevel, HEAT_LABEL,
} from '@/lib/tapEarn';
import { sle } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';

/* Heat → small badge/text accents only. No large-area color animation —
   that's what was costing frames on rapid taps. */
const HEAT_STYLE: Record<HeatLevel, { text: string; dot: string }> = {
  normal:     { text: 'text-sky-400',    dot: 'bg-sky-400' },
  warm:       { text: 'text-amber-400',  dot: 'bg-amber-400' },
  hot:        { text: 'text-orange-400', dot: 'bg-orange-400' },
  'very-hot': { text: 'text-red-400',    dot: 'bg-red-400' },
  max:        { text: 'text-red-500',    dot: 'bg-red-500' },
};

const Mine = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const t = useTapEarn();
  const [leverageOpen, setLeverageOpen] = useState(false);
  // Only the coarse heat *level* is lifted up — it changes rarely (a handful
  // of times per session), unlike combo/heat which change on every single
  // tap. This keeps Header/BalanceHero from re-rendering on every tap.
  const [heatLevel, setHeatLevel] = useState<HeatLevel>('normal');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const per = rewardPerTap(t.profile.leverage_level);
  const progressPct = Math.min(100, ((t.displayUnits % 1) / 1) * 100);

  const handleTap = useCallback(() => {
    t.tap();
  }, [t]);

  const openLeverage = useCallback(() => setLeverageOpen(true), []);
  const goHome = useCallback(() => navigate('/home'), [navigate]);

  const unlock = useCallback((level: number, cost: number) => {
    localStorage.setItem('mine_pending_leverage', String(level));
    navigate(`/wallet?deposit=1&amount=${cost}&leverage=${level}`);
  }, [navigate]);

  if (authLoading || t.loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
          <PageLoader inline />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] bg-background overflow-hidden flex flex-col">
      <MineStyles />
      {/* Static ambient base layer — pure CSS animation, no JS state, effectively free */}
      <div className="mn-ambient" />

      <Header multiplier={leverageMult(t.profile.leverage_level)} onBack={goHome} onLeverage={openLeverage} />

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-3 flex flex-col gap-3 animate-fade-in">
        <BalanceHero
          displayUnits={t.displayUnits}
          walletBalance={wallet?.balance ?? 0}
          heatLevel={heatLevel}
          progressPct={progressPct}
        />

        {/* Tap zone owns its own heat state — its re-renders never touch
            Header or BalanceHero, and it drives the fixed full-screen glow
            layer itself, so the "page background reacting to your taps"
            effect stays isolated to this subtree. */}
        <TapArea
          onTap={handleTap}
          rewardLabel={formatUnits(per, 7)}
          onLevelChange={setHeatLevel}
        />
      </main>

      <div className="relative z-10 shrink-0"><BottomNav /></div>

      <Drawer open={leverageOpen} onOpenChange={setLeverageOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" /> Leverage Tiers
            </DrawerTitle>
            <DrawerDescription>Unlock higher tiers to multiply every tap. Deposit to unlock instantly.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8 space-y-3">
            {LEVERAGE.map((tier) => (
              <LeverageCard
                key={tier.level}
                tier={tier}
                current={t.profile.leverage_level}
                balance={wallet?.balance ?? 0}
                onUnlock={() => unlock(tier.level, tier.cost)}
              />
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

/* ─────────── Header (memoized — only re-renders when multiplier changes) ─────────── */
const Header = memo(({ multiplier, onBack, onLeverage }: {
  multiplier: number; onBack: () => void; onLeverage: () => void;
}) => (
  <header className="relative z-20 shrink-0 backdrop-blur-md bg-background/70 border-b border-border/50">
    <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-muted active:scale-90 transition-transform">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <Pickaxe className="w-4 h-4 text-amber-400" />
        <h1 className="text-base font-display font-bold gold-text">Mine</h1>
      </div>
      <button
        onClick={onLeverage}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl gold-border bg-card/60 text-xs font-bold text-amber-400 active:scale-95 transition-transform"
      >
        <Zap className="w-3.5 h-3.5" /> {multiplier}x
      </button>
    </div>
  </header>
));
Header.displayName = 'Header';

/* ─────────── Balance hero (memoized — re-renders only when its own props change) ─────────── */
const BalanceHero = memo(({ displayUnits, walletBalance, heatLevel, progressPct }: {
  displayUnits: number; walletBalance: number; heatLevel: HeatLevel; progressPct: number;
}) => {
  const heatStyle = HEAT_STYLE[heatLevel];
  return (
    <section className="shrink-0 rounded-2xl p-4 bg-card/60 backdrop-blur-md gold-border shadow-float text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Total Units Mined</p>
      <AnimatedNumber
        value={displayUnits}
        decimals={8}
        duration={280}
        className="block text-[27px] leading-tight font-display font-black tabular-nums gold-text"
      />
      <div className="mt-2 flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Wallet className="w-3.5 h-3.5" /> {sle(walletBalance)}
        </span>
        <span className={cn('flex items-center gap-1 font-semibold', heatStyle.text)}>
          <span className={cn('w-2 h-2 rounded-full', heatStyle.dot)} /> {HEAT_LABEL[heatLevel]}
        </span>
      </div>
      <div className="mt-3 text-left">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progress to next unit</span>
          <span className="tabular-nums">{progressPct.toFixed(2)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          {/* transform (not width) — GPU-composited, buttery even at high tap rates */}
          <div
            className="h-full w-full origin-left gold-surface"
            style={{ transform: `scaleX(${progressPct / 100})`, transition: 'transform 0.25s ease-out' }}
          />
        </div>
      </div>
    </section>
  );
});
BalanceHero.displayName = 'BalanceHero';

/* ─────────── Tap zone: owns heat/combo state locally so rapid taps never
   ripple up into the rest of the tree. Also renders the fixed, full-screen
   heat-reactive glow (mounted here, painted over the whole viewport via
   position:fixed, but structurally isolated to this component). ─────────── */
const TapArea = ({ onTap, rewardLabel, onLevelChange }: {
  onTap: () => void; rewardLabel: string; onLevelChange: (l: HeatLevel) => void;
}) => {
  const [heat, setHeat] = useState({ heat: 0, level: 'normal' as HeatLevel, combo: 0 });
  const lastLevel = useRef<HeatLevel>('normal');

  const handleState = useCallback((s: { heat: number; level: HeatLevel; combo: number }) => {
    setHeat((prev) => {
      if (prev.combo === s.combo && prev.level === s.level) return prev;
      return s;
    });
    if (s.level !== lastLevel.current) {
      lastLevel.current = s.level;
      onLevelChange(s.level);
    }
  }, [onLevelChange]);

  return (
    <div className="flex-1 min-h-0 grid place-items-center relative mn-tap-zone">
      <ComboBadge combo={heat.combo} level={heat.level} />
      <MineButton onTap={onTap} rewardLabel={rewardLabel} onState={handleState} />
    </div>
  );
};

/* ─────────── Combo badge — upgraded: tiered gradient, icon, and a light
   one-shot pop-in on every combo increment (transform/opacity only, no
   layout or paint-heavy work, and it unmounts entirely below combo 5 so it
   costs nothing at rest). ─────────── */
const COMBO_STYLE: Record<HeatLevel, string> = {
  normal: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  warm: 'bg-amber-400/20 text-amber-300 border border-amber-400/40',
  hot: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border border-transparent',
  'very-hot': 'bg-gradient-to-r from-orange-500 to-red-500 text-white border border-transparent',
  max: 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 text-white border border-transparent',
};
const ComboBadge = memo(({ combo, level }: { combo: number; level: HeatLevel }) => {
  if (combo < 5) return null;
  return (
    <span
      key={combo}
      className={cn(
        'absolute top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wide shadow-lg mn-combo-pop',
        COMBO_STYLE[level],
      )}
    >
      <Flame className="w-3.5 h-3.5" /> x{combo}
    </span>
  );
});
ComboBadge.displayName = 'ComboBadge';

/* ─────────── Leverage list item ─────────── */
const LeverageCard = memo(({ tier, current, balance, onUnlock }: {
  tier: typeof LEVERAGE[number]; current: number; balance: number; onUnlock: () => void;
}) => {
  const owned = current >= tier.level;
  const isActive = current === tier.level;
  const affordable = balance >= tier.cost;
  return (
    <div className={cn(
      'rounded-2xl p-4 backdrop-blur-md transition-all',
      owned ? 'bg-amber-500/10 gold-border' : 'bg-card/70 border border-border/50',
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-12 h-12 shrink-0 rounded-xl grid place-items-center font-black text-sm',
            owned ? 'gold-surface text-black' : 'bg-muted text-muted-foreground',
          )}>
            {owned ? `${tier.mult}x` : <Lock className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm flex items-center gap-1.5">
              {tier.mult}x Power
              {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">ACTIVE</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatUnits(0.0000005 * tier.mult, 8)} / tap</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {owned ? (
            <span className="flex items-center gap-1 text-success text-xs font-semibold">
              <Check className="w-4 h-4" /> Owned
            </span>
          ) : (
            <>
              <p className="text-sm font-bold">{sle(tier.cost)}</p>
              <button
                onClick={onUnlock}
                className="mt-1 px-3 py-1.5 rounded-lg gold-surface text-black text-xs font-bold active:scale-95 transition-transform"
              >
                {affordable ? 'Unlock' : 'Deposit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
LeverageCard.displayName = 'LeverageCard';

/* ─────────── Styles: self-contained, GPU-cheap (opacity/transform only —
   no backdrop-filter in the animated layers, so 100fps stays reachable
   even on mid-range phones while tapping as fast as physically possible). ─────────── */
const MineStyles = () => (
  <style>{`
    .mn-ambient {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(circle at 18% 12%, hsla(217, 70%, 55%, 0.10) 0%, transparent 50%),
        radial-gradient(circle at 85% 88%, hsla(38, 80%, 55%, 0.07) 0%, transparent 55%),
        hsl(var(--background));
    }
    .mn-tap-zone { contain: layout paint; touch-action: manipulation; -webkit-user-select: none; user-select: none; }
    .mn-combo-pop { animation: mnComboPop 0.22s cubic-bezier(0.34,1.56,0.64,1); will-change: transform; }
    @keyframes mnComboPop {
      0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
      100% { transform: translateX(-50%) scale(1); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mn-combo-pop { animation: none; }
    }
  `}</style>
);

export default Mine;
