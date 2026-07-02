import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, MoreHorizontal, Coins, Flame, Gauge, Trophy, History as HistoryIcon,
  Sparkles, Lock, Check, Zap, Gift, TrendingUp, Wallet, Target, Timer,
  Award, Crown, CheckCircle2, Wifi, WifiOff,
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useTapEarn } from '@/hooks/useTapEarn';
import {
  useTapLeaderboard, useTapHistory, useTapAchievements, LeaderMetric,
} from '@/hooks/useTapExtras';
import { TapCoin } from '@/components/tap/TapCoin';
import { AnimatedNumber } from '@/components/tap/AnimatedNumber';
import {
  LEVERAGE, ACHIEVEMENTS, UNIT_TARGET, rewardPerTap, leverageMult, formatUnits,
} from '@/lib/tapEarn';
import { sle } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import { toast } from '@/hooks/use-toast';

type Tab = 'tap' | 'upgrade' | 'rewards' | 'top' | 'history';

const TABS: { id: Tab; label: string; icon: typeof Coins }[] = [
  { id: 'tap', label: 'Tap', icon: Coins },
  { id: 'upgrade', label: 'Leverage', icon: Gauge },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'top', label: 'Top', icon: Trophy },
  { id: 'history', label: 'History', icon: HistoryIcon },
];

const Rewards = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const t = useTapEarn();
  const [tab, setTab] = useState<Tab>('tap');
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [tapTier, setTapTier] = useState(0); // 0-6, escalates with rapid consecutive taps (Warm → Legendary)

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (tab !== 'tap') setTapTier(0);
  }, [tab]);

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

  const per = rewardPerTap(t.profile.leverage_level);
  const progressPct = Math.min(100, ((t.displayUnits % 1) / 1) * 100);
  const remainingTaps = Math.max(0, Math.ceil((1 - (t.displayUnits % 1)) / per));

  const activeTabMeta = TABS.find((tb) => tb.id === tab)!;
  const tierMetaTop = COMBO_TIERS[tapTier];
  const ActiveIcon = tab === 'tap' && tapTier >= 2 ? Flame : activeTabMeta.icon;

  return (
    <div className="rewards-page relative h-[100dvh] bg-background overflow-hidden flex flex-col">
      <ComboKeyframes />
      <div className="rewards-aurora" />
      <ScreenFlameOverlay tier={tapTier} accent={tierMetaTop.accent} />

      {/* Header */}
      <header className="relative z-20 shrink-0 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h1 className="text-base font-display font-bold gold-text">Cash Miner</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            {t.online ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-destructive" />}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2 flex flex-col gap-3 animate-fade-in">
        {/* Balance hero */}
        <section
          className={cn(
            'shrink-0 rounded-2xl p-3.5 backdrop-blur-xl shadow-float text-center transition-all duration-300 border',
            tapTier >= 3 ? 'bg-gradient-to-br from-orange-500/25 via-card/60 to-red-500/15' :
            tapTier >= 1 ? 'bg-card/60' :
            'bg-card/60 gold-border',
          )}
          style={tapTier >= 1 ? {
            borderColor: `${tierMetaTop.accent}b0`,
            boxShadow: `0 0 ${16 + tapTier * 16}px ${tierMetaTop.accent}${tapTier >= 5 ? '99' : '55'}`,
          } : undefined}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
            Total Units Mined
            {tapTier >= 2 && (
              <Flame
                className="w-3 h-3"
                style={{ color: tierMetaTop.accent, animation: 'flameFlicker 0.5s ease-in-out infinite' }}
              />
            )}
          </p>
          <span
            key={tapTier >= 2 ? `hot-${Math.floor(Date.now() / 350)}` : 'calm'}
            className="block"
            style={tapTier >= 2 ? { animation: 'numberPop 0.35s ease-out' } : undefined}
          >
            <AnimatedNumber
              value={t.displayUnits}
              decimals={8}
              duration={350}
              className={cn(
                'block text-2xl font-display font-black tabular-nums leading-tight transition-colors',
                tapTier >= 3 ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-red-400' : 'gold-text',
              )}
            />
          </span>
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> {sle(wallet?.balance ?? 0)}
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <Zap className="w-3.5 h-3.5" /> {leverageMult(t.profile.leverage_level)}x
            </span>
          </div>

          {/* Progress to 1 unit */}
          <div className="mt-2.5 text-left">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progress to 1 unit</span>
              <span>{progressPct.toFixed(2)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full transition-[width] duration-300', tapTier >= 3 ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500' : 'gold-surface')}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground text-right">
              ~<AnimatedNumber value={remainingTaps} compact className="tabular-nums" /> taps left
            </p>
          </div>
        </section>

        {/* Expandable dashboard toolbar — a three-dot control switches between tabs */}
        <div className="relative shrink-0 z-20">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-2xl bg-muted/60 backdrop-blur-sm border transition-all',
              tapTier < 1 && 'gold-border',
              toolbarOpen ? 'p-1' : 'pl-3.5 pr-1.5 py-1.5',
            )}
            style={tapTier >= 1 ? {
              borderColor: `${tierMetaTop.accent}90`,
              boxShadow: `0 0 ${8 + tapTier * 6}px ${tierMetaTop.accent}55`,
            } : undefined}
          >
            {!toolbarOpen ? (
              <span className="flex-1 flex items-center gap-2 text-xs font-bold">
                <span
                  className={cn('w-6 h-6 rounded-lg text-black grid place-items-center', tapTier < 1 && 'gold-surface')}
                  style={tapTier >= 1 ? { background: tierMetaTop.accent } : undefined}
                >
                  <ActiveIcon className="w-3.5 h-3.5" />
                </span>
                {activeTabMeta.label}
              </span>
            ) : (
              <div className="flex-1 flex gap-1 animate-fade-in">
                {TABS.map((tb) => {
                  const Icon = tb.id === 'tap' && tapTier >= 2 ? Flame : tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => { setTab(tb.id); setToolbarOpen(false); }}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all',
                        active ? 'text-black shadow' : 'text-muted-foreground hover:text-foreground',
                        active && tapTier < 1 && 'gold-surface',
                      )}
                      style={active && tapTier >= 1 ? { background: tierMetaTop.accent } : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {tb.label}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setToolbarOpen((o) => !o)}
              aria-label={toolbarOpen ? 'Collapse tab switcher' : 'Switch tabs'}
              aria-expanded={toolbarOpen}
              className="shrink-0 w-8 h-8 rounded-xl grid place-items-center text-muted-foreground hover:text-foreground hover:bg-background/60 active:scale-90 transition-all"
            >
              <MoreHorizontal className={cn('w-4 h-4 transition-transform duration-200', toolbarOpen && 'rotate-90')} />
            </button>
          </div>
        </div>

        {/* Scrollable tab content — only this area scrolls, the shell never does */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-4">
          {tab === 'tap' && <TapSection t={t} per={per} onTierChange={setTapTier} />}
          {tab === 'upgrade' && <UpgradeSection t={t} wallet={wallet} refetchWallet={refetchWallet} />}
          {tab === 'rewards' && <RewardsSection t={t} refetchWallet={refetchWallet} />}
          {tab === 'top' && <LeaderboardSection />}
          {tab === 'history' && <HistorySection />}
        </div>
      </main>

      {/*
        BottomNav renders itself fixed to the viewport, so it takes no space in this
        flex column on its own — content used to run underneath and get covered by it.
        This spacer reserves real height for it (plus the iOS home-indicator safe area)
        and fades content out softly instead of letting it get clipped by the nav.
      */}
      <div className="shrink-0 relative z-10 h-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <div className="absolute inset-x-0 -top-5 h-5 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>

      <BottomNav />
    </div>
  );
};

/* ─────────── Combo animation keyframes (self-contained, injected once) ─────────── */
const ComboKeyframes = () => (
  <style>{`
    @keyframes flameFlicker {
      0%, 100% { transform: scale(1) rotate(-3deg); filter: brightness(1); }
      50% { transform: scale(1.12) rotate(3deg); filter: brightness(1.35); }
    }
    @keyframes numberPop {
      0% { transform: scale(1); }
      35% { transform: scale(1.14); }
      65% { transform: scale(0.97); }
      100% { transform: scale(1); }
    }
    @keyframes popFloat {
      0% { transform: translate(-50%, 0) scale(0.7); opacity: 0; }
      15% { opacity: 1; transform: translate(-50%, -6px) scale(1.05); }
      100% { transform: translate(-50%, -46px) scale(1); opacity: 0; }
    }
    @keyframes sparkBurst {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }
    @keyframes ringPulse {
      0% { transform: scale(0.85); opacity: 0.55; }
      100% { transform: scale(1.7); opacity: 0; }
    }
    @keyframes coinShake {
      0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
      25% { transform: translateX(calc(var(--shake, 2) * -1px)) translateY(1px) rotate(-1.5deg); }
      75% { transform: translateX(calc(var(--shake, 2) * 1px)) translateY(-1px) rotate(1.5deg); }
    }
    @keyframes ringSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes ringSpinReverse {
      0% { transform: rotate(360deg); }
      100% { transform: rotate(0deg); }
    }
    @keyframes emberRise {
      0% { transform: translate(0, 0) scale(1); opacity: 0.95; }
      100% { transform: translate(var(--ex), -80px) scale(0.25); opacity: 0; }
    }
    @keyframes neonPulse {
      0%, 100% { filter: drop-shadow(0 0 5px var(--neon)) drop-shadow(0 0 12px var(--neon)); }
      50% { filter: drop-shadow(0 0 12px var(--neon)) drop-shadow(0 0 26px var(--neon)); }
    }
    @keyframes levelFlash {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      18% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      40% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.35); opacity: 0; }
    }
    @keyframes screenIgnite {
      0%, 100% { opacity: var(--ignite-base, 0.4); }
      50% { opacity: var(--ignite-peak, 0.85); }
    }
    @keyframes hueShift {
      0% { filter: hue-rotate(0deg) saturate(1.4); }
      100% { filter: hue-rotate(360deg) saturate(1.4); }
    }
  `}</style>
);

/* Combo tiers: escalating stages of a rapid-tap streak (taps within ~650ms of each other) */
const COMBO_TIERS = [
  { min: 0,     label: '',           short: '',    accent: '#94a3b8' },
  { min: 15,    label: 'Warm',       short: 'WARM',      accent: '#fbbf24' },
  { min: 50,    label: 'Heating Up', short: 'HEATING',   accent: '#fb923c' },
  { min: 150,   label: 'Blazing',    short: 'BLAZING',   accent: '#f97316' },
  { min: 400,   label: 'Inferno',    short: 'INFERNO',   accent: '#ef4444' },
  { min: 1000,  label: 'Supernova',  short: 'SUPERNOVA', accent: '#ff2d55' },
  { min: 10000, label: 'Legendary',  short: 'LEGENDARY', accent: '#ffd60a' },
] as const;

const getTier = (combo: number) => {
  let tier = 0;
  for (let i = 0; i < COMBO_TIERS.length; i++) if (combo >= COMBO_TIERS[i].min) tier = i;
  return tier;
};

/* Full-viewport ignite layer — kicks in at Supernova (1,000) and maxes out at Legendary (10,000) */
const ScreenFlameOverlay = ({ tier, accent }: { tier: number; accent: string }) => {
  if (tier < 5) return null;
  const legendary = tier >= 6;
  return (
    <div
      className="fixed inset-0 z-[2] pointer-events-none overflow-hidden"
      style={{
        animation: `screenIgnite ${legendary ? '0.6s' : '0.9s'} ease-in-out infinite${legendary ? ', hueShift 4s linear infinite' : ''}`,
        ['--ignite-base' as any]: legendary ? 0.55 : 0.35,
        ['--ignite-peak' as any]: legendary ? 0.95 : 0.7,
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 105%, ${accent}88 0%, transparent 55%)` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% -5%, ${accent}55 0%, transparent 50%)` }}
      />
      <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 90px ${accent}` }} />
    </div>
  );
};

/* ─────────── TAP ─────────── */
const TapSection = ({ t, per, onTierChange }: {
  t: ReturnType<typeof useTapEarn>; per: number; onTierChange?: (tier: number) => void;
}) => {
  const [combo, setCombo] = useState(0);
  const [pops, setPops] = useState<{ id: number; label: string }[]>([]);
  const [sparks, setSparks] = useState<{ id: number; tx: number; ty: number }[]>([]);
  const [embers, setEmbers] = useState<{ id: number; ex: number }[]>([]);
  const [flash, setFlash] = useState<{ id: number; label: string } | null>(null);
  const lastTapAt = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  const seedRef = useRef(0);
  const tier = getTier(combo);
  const tierMeta = COMBO_TIERS[tier];

  useEffect(() => {
    onTierChange?.(tier);
  }, [tier, onTierChange]);

  useEffect(() => () => resetTimer.current && clearTimeout(resetTimer.current), []);

  // Continuous embers rising off the coin once things start heating up (tier 2+)
  useEffect(() => {
    if (tier < 2) return;
    const spawn = setInterval(() => {
      const id = ++seedRef.current;
      const ex = (Math.random() - 0.5) * 70;
      setEmbers((e) => [...e.slice(-16), { id, ex }]);
      setTimeout(() => setEmbers((e) => e.filter((em) => em.id !== id)), 850);
    }, Math.max(110, 260 - tier * 30));
    return () => clearInterval(spawn);
  }, [tier]);

  const handleTap = () => {
    const now = Date.now();
    const gap = now - lastTapAt.current;
    lastTapAt.current = now;
    const nextCombo = gap < 650 ? combo + 1 : 1;
    const prevTier = getTier(combo);
    const nextTier = getTier(nextCombo);
    setCombo(nextCombo);

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCombo(0), 1000);

    // floating "+amount" pop, every tap
    const id = ++seedRef.current;
    setPops((p) => [...p.slice(-4), { id, label: `+${formatUnits(per, 7)}` }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 650);

    // level up: spark burst + big flash callout, scales with how far it jumped
    if (nextTier > prevTier) {
      const nextMeta = COMBO_TIERS[nextTier];
      const count = 6 + nextTier * 3;
      const burst = Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count;
        const dist = 42 + nextTier * 9;
        return { id: ++seedRef.current, tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist };
      });
      setSparks((s) => [...s, ...burst]);
      setTimeout(() => setSparks((s) => s.filter((sp) => !burst.some((b) => b.id === sp.id))), 600);

      const flashId = ++seedRef.current;
      setFlash({ id: flashId, label: nextMeta.label });
      setTimeout(() => setFlash((f) => (f?.id === flashId ? null : f)), 850);
    }

    t.tap();
  };

  const stats = [
    { label: 'Earnings / tap', value: formatUnits(per, 8), icon: Zap },
    { label: "Today's taps", value: t.displayTodayTaps.toLocaleString(), icon: Flame },
    { label: 'Lifetime taps', value: t.displayTaps.toLocaleString(), icon: Target },
    { label: "Today's units", value: formatUnits(t.displayTodayUnits, 8), icon: Coins },
    { label: 'Leverage', value: `${leverageMult(t.profile.leverage_level)}x`, icon: Gauge },
    { label: 'Login streak', value: `${t.profile.daily_streak}d`, icon: Award },
  ];

  return (
    <div className="space-y-5">
      {/* Combo badge — grows and reads out the current streak */}
      <div className="flex items-center justify-center h-7">
        {tier > 0 && (
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase tracking-wide text-white transition-all duration-200"
            style={{
              background: `linear-gradient(90deg, ${tierMeta.accent}, ${tierMeta.accent}bb)`,
              boxShadow: `0 0 ${8 + tier * 6}px ${tierMeta.accent}`,
              fontSize: `${11 + tier}px`,
              animation: tier >= 2 ? 'flameFlicker 0.5s ease-in-out infinite' : undefined,
            }}
          >
            <Flame className="w-3.5 h-3.5" />
            {tierMeta.short} • x{combo.toLocaleString()}
          </span>
        )}
      </div>

      {/* Coin stage — rings, embers, sparks, pops, level-up flash, and the coin itself */}
      <div className="relative flex items-center justify-center h-52">
        {tier >= 2 && (
          <span
            className="absolute w-44 h-44 rounded-full border-2 border-dashed pointer-events-none"
            style={{ borderColor: `${tierMeta.accent}66`, animation: 'ringSpin 6s linear infinite' }}
          />
        )}
        {tier >= 4 && (
          <span
            className="absolute w-52 h-52 rounded-full border border-dotted pointer-events-none"
            style={{ borderColor: `${tierMeta.accent}44`, animation: 'ringSpinReverse 9s linear infinite' }}
          />
        )}
        {tier >= 1 && (
          <span
            key={`ring-${combo}`}
            className="absolute w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${tierMeta.accent}55 0%, transparent 70%)`,
              animation: 'ringPulse 0.7s ease-out',
            }}
          />
        )}

        {embers.map((em) => (
          <span
            key={em.id}
            className="absolute bottom-10 w-1.5 h-1.5 rounded-full pointer-events-none"
            style={{
              background: tierMeta.accent,
              boxShadow: `0 0 6px ${tierMeta.accent}`,
              ['--ex' as any]: `${em.ex}px`,
              animation: 'emberRise 0.85s ease-out forwards',
            }}
          />
        ))}

        {sparks.map((s) => (
          <span
            key={s.id}
            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
            style={{
              background: tierMeta.accent,
              boxShadow: `0 0 8px ${tierMeta.accent}`,
              ['--tx' as any]: `${s.tx}px`,
              ['--ty' as any]: `${s.ty}px`,
              animation: 'sparkBurst 0.6s ease-out forwards',
            }}
          />
        ))}

        {pops.map((p) => (
          <span
            key={p.id}
            className="absolute top-2 left-1/2 text-xs font-black tabular-nums pointer-events-none"
            style={{ color: tier > 0 ? tierMeta.accent : '#fbbf24', animation: 'popFloat 0.65s ease-out forwards' }}
          >
            {p.label}
          </span>
        ))}

        {flash && (
          <span
            key={flash.id}
            className="absolute left-1/2 top-1/2 whitespace-nowrap text-2xl font-display font-black uppercase tracking-widest pointer-events-none"
            style={{
              color: tierMeta.accent,
              textShadow: `0 0 10px ${tierMeta.accent}, 0 0 26px ${tierMeta.accent}`,
              animation: 'levelFlash 0.85s ease-out forwards',
            }}
          >
            {flash.label}!
          </span>
        )}

        <div
          className="relative"
          style={
            tier >= 3
              ? {
                  ['--shake' as any]: 1 + tier,
                  animation: `coinShake ${Math.max(0.12, 0.3 - tier * 0.03)}s ease-in-out infinite`,
                  filter: `drop-shadow(0 0 ${6 + tier * 6}px ${tierMeta.accent})`,
                }
              : tier >= 1
              ? { filter: `drop-shadow(0 0 ${4 + tier * 4}px ${tierMeta.accent})` }
              : undefined
          }
        >
          {tier >= 2 && (
            <Flame
              className="absolute -top-3 -right-2 w-6 h-6 z-10"
              style={{
                color: tierMeta.accent,
                ['--neon' as any]: tierMeta.accent,
                animation: 'neonPulse 0.8s ease-in-out infinite, flameFlicker 0.5s ease-in-out infinite',
              }}
            />
          )}
          <TapCoin onTap={handleTap} rewardLabel={formatUnits(per, 7)} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground -mt-2">
        Tap fast — every tap is counted & verified {t.syncing && '• syncing…'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const isEarnings = s.label === 'Earnings / tap';
          const Icon = isEarnings && tier >= 2 ? Flame : s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl p-3 bg-card/60 backdrop-blur-md gold-border transition-all duration-200"
              style={isEarnings && tier >= 1 ? { boxShadow: `0 0 ${10 + tier * 8}px ${tierMeta.accent}88` } : undefined}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Icon className="w-3 h-3" style={{ color: isEarnings && tier >= 1 ? tierMeta.accent : '#fbbf24' }} /> {s.label}
              </div>
              <p
                className="text-sm font-bold tabular-nums truncate"
                style={
                  isEarnings && tier >= 1
                    ? { color: tierMeta.accent, animation: tier >= 2 ? 'numberPop 0.3s ease-out' : undefined }
                    : undefined
                }
              >
                {s.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────── UPGRADE ─────────── */
const UpgradeSection = ({ t, wallet, refetchWallet }: {
  t: ReturnType<typeof useTapEarn>; wallet: any; refetchWallet: () => void;
}) => {
  const [confirm, setConfirm] = useState<typeof LEVERAGE[0] | null>(null);
  const [busy, setBusy] = useState(false);
  const current = t.profile.leverage_level;
  const balance = wallet?.balance ?? 0;

  const doBuy = async () => {
    if (!confirm) return;
    setBusy(true);
    const res = await t.buyLeverage(confirm.level);
    setBusy(false);
    if (res.error) {
      toast({ title: 'Upgrade failed', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: `Leverage ${confirm.mult}x active! ⚡`, description: 'Your earnings per tap just jumped.' });
      refetchWallet();
      if (res.unlocked?.length) {
        toast({ title: `Achievement unlocked!`, description: res.unlocked.map((a) => a.title).join(', ') });
      }
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-3">
      {LEVERAGE.map((tier) => {
        const owned = current >= tier.level;
        const isNext = tier.level === current + 1;
        const locked = tier.level > current + 1;
        const affordable = balance >= tier.cost;
        return (
          <div
            key={tier.level}
            className={cn(
              'rounded-2xl p-4 backdrop-blur-md transition-all',
              owned ? 'bg-amber-500/10 gold-border' :
              isNext ? 'bg-card/70 gold-border shadow-float' :
              'bg-card/40 border border-border/50 opacity-70',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-11 h-11 rounded-xl grid place-items-center font-black text-sm',
                  owned || isNext ? 'gold-surface text-black' : 'bg-muted text-muted-foreground',
                )}>
                  {locked ? <Lock className="w-4 h-4" /> : `${tier.mult}x`}
                </div>
                <div>
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    Level {tier.level}
                    {owned && current === tier.level && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">ACTIVE</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatUnits(0.0000005 * tier.mult, 8)} / tap
                  </p>
                </div>
              </div>
              <div className="text-right">
                {owned ? (
                  <span className="flex items-center gap-1 text-success text-xs font-semibold">
                    <Check className="w-4 h-4" /> Owned
                  </span>
                ) : (
                  <>
                    <p className="text-sm font-bold">{sle(tier.cost)}</p>
                    <button
                      disabled={!isNext || !affordable}
                      onClick={() => setConfirm(tier)}
                      className={cn(
                        'mt-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all',
                        isNext && affordable ? 'gold-surface text-black active:scale-95' :
                        'bg-muted text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {isNext ? (affordable ? 'Upgrade' : 'Need funds') : 'Locked'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <Drawer open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DrawerContent>
          {confirm && (
            <>
              <DrawerHeader>
                <DrawerTitle className="gold-text">Upgrade to {confirm.mult}x leverage</DrawerTitle>
                <DrawerDescription>Boost your earnings per tap instantly.</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-3 bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Now</p>
                    <p className="font-bold">{formatUnits(rewardPerTap(t.profile.leverage_level), 8)}</p>
                  </div>
                  <div className="rounded-xl p-3 bg-amber-500/10 gold-border">
                    <p className="text-[10px] text-muted-foreground">After</p>
                    <p className="font-bold gold-text">{formatUnits(0.0000005 * confirm.mult, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-bold">{sle(confirm.cost)}</span>
                </div>
              </div>
              <DrawerFooter>
                <button
                  disabled={busy}
                  onClick={doBuy}
                  className="w-full py-3 rounded-xl gold-surface text-black font-bold active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? 'Upgrading…' : `Confirm • ${sle(confirm.cost)}`}
                </button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

/* ─────────── REWARDS (daily + achievements) ─────────── */
const RewardsSection = ({ t, refetchWallet }: {
  t: ReturnType<typeof useTapEarn>; refetchWallet: () => void;
}) => {
  const { keys, refetch } = useTapAchievements();
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    const res = await t.claimDaily();
    setBusy(false);
    if (res.error) {
      toast({ title: 'Not yet', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: `+${sle(res.bonus ?? 0)} 🎁`, description: `Day ${res.streak} streak bonus claimed!` });
      refetchWallet();
    }
  };

  return (
    <div className="space-y-5">
      {/* Daily bonus */}
      <section className="rounded-2xl p-4 bg-card/60 backdrop-blur-md gold-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <div>
              <p className="font-bold text-sm">Daily bonus</p>
              <p className="text-[11px] text-muted-foreground">Streak: {t.profile.daily_streak} days</p>
            </div>
          </div>
          <button
            disabled={!t.canClaimDaily || busy}
            onClick={claim}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all',
              t.canClaimDaily ? 'gold-surface text-black active:scale-95' : 'bg-muted text-muted-foreground',
            )}
          >
            {t.canClaimDaily ? 'Claim' : 'Claimed'}
          </button>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-8 rounded-lg grid place-items-center text-[10px] font-bold',
                i < t.profile.daily_streak ? 'gold-surface text-black' : 'bg-muted text-muted-foreground',
              )}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" /> Achievements
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = keys.has(a.key);
            return (
              <div
                key={a.key}
                className={cn(
                  'rounded-2xl p-3 backdrop-blur-md transition-all',
                  unlocked ? 'bg-amber-500/10 gold-border' : 'bg-card/40 border border-border/50 opacity-70',
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl grid place-items-center mb-2',
                  unlocked ? 'gold-surface text-black' : 'bg-muted text-muted-foreground',
                )}>
                  {unlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <p className="text-xs font-bold leading-tight">{a.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
                <p className={cn('text-[10px] font-semibold mt-1', unlocked ? 'text-success' : 'text-amber-400')}>
                  {unlocked ? 'Unlocked' : `Reward ${sle(a.reward)}`}
                </p>
              </div>
            );
          })}
        </div>
        <button onClick={refetch} className="hidden" aria-hidden />
      </section>
    </div>
  );
};

/* ─────────── LEADERBOARD ─────────── */
const LeaderboardSection = () => {
  const [metric, setMetric] = useState<LeaderMetric>('units');
  const { rows, loading } = useTapLeaderboard(metric);
  const metrics: { id: LeaderMetric; label: string }[] = [
    { id: 'units', label: 'Earnings' },
    { id: 'taps', label: 'Taps' },
    { id: 'leverage', label: 'Leverage' },
  ];
  const value = (r: typeof rows[0]) =>
    metric === 'units' ? formatUnits(r.total_units, 6)
    : metric === 'taps' ? r.lifetime_taps.toLocaleString()
    : `${leverageMult(r.leverage_level)}x`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
        {metrics.map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
              metric === m.id ? 'gold-surface text-black' : 'text-muted-foreground',
            )}
          >{m.label}</button>
        ))}
      </div>
      {loading ? (
        <div className="py-10"><PageLoader inline /></div>
      ) : rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No miners yet — be the first!</p>
      ) : rows.map((r) => (
        <div key={r.user_id} className="flex items-center gap-3 rounded-2xl p-3 bg-card/60 backdrop-blur-md gold-border">
          <div className={cn(
            'w-8 h-8 rounded-lg grid place-items-center font-black text-xs',
            r.rank <= 3 ? 'gold-surface text-black' : 'bg-muted text-muted-foreground',
          )}>{r.rank}</div>
          <p className="flex-1 font-semibold text-sm truncate">{r.user_name}</p>
          <p className="font-bold text-sm gold-text tabular-nums">{value(r)}</p>
        </div>
      ))}
    </div>
  );
};

/* ─────────── HISTORY ─────────── */
const HistorySection = () => {
  const { rows, loading } = useTapHistory();
  const icon = (type: string) =>
    type === 'leverage' ? Gauge : type === 'daily' ? Gift : type === 'achievement' ? Award : Sparkles;
  if (loading) return <div className="py-10"><PageLoader inline /></div>;
  if (!rows.length) return <p className="text-center text-sm text-muted-foreground py-10">No activity yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((h) => {
        const Icon = icon(h.type);
        const positive = h.amount_sle >= 0;
        return (
          <div key={h.id} className="flex items-center gap-3 rounded-2xl p-3 bg-card/60 backdrop-blur-md gold-border">
            <div className="w-9 h-9 rounded-xl grid place-items-center gold-surface text-black">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{h.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {new Date(h.created_at).toLocaleString()}
              </p>
            </div>
            {h.amount_sle !== 0 && (
              <p className={cn('font-bold text-sm', positive ? 'text-success' : 'text-destructive')}>
                {positive ? '+' : ''}{sle(h.amount_sle)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Rewards;
