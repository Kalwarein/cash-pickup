import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, Coins, Flame, Gauge, Trophy, History as HistoryIcon,
  Sparkles, Lock, Check, Zap, Gift, TrendingUp, Wallet, Target, Timer,
  Award, Crown, CheckCircle2, MoreVertical, X,
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

type Tab = 'upgrade' | 'rewards' | 'top' | 'history';

const MENU_ITEMS: { id: Tab; label: string; description: string; icon: typeof Coins }[] = [
  { id: 'upgrade', label: 'Leverage', description: 'Select your tap leverage tier', icon: Gauge },
  { id: 'rewards', label: 'Rewards', description: 'Daily bonus & achievements', icon: Gift },
  { id: 'top', label: 'Top', description: 'See the leaderboard', icon: Trophy },
  { id: 'history', label: 'History', description: 'Your activity log', icon: HistoryIcon },
];

const Rewards = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const t = useTapEarn();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<Tab | null>(null);
  const [tapTier, setTapTier] = useState(0); // 0-4, escalates with rapid consecutive taps

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  // lock body scroll while the sidebar or a full-screen modal is open
  useEffect(() => {
    if (sidebarOpen || activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, activeModal]);

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

  const openModal = (id: Tab) => {
    setSidebarOpen(false);
    setActiveModal(id);
  };

  return (
    <div className="rewards-page relative h-[100dvh] bg-background overflow-hidden flex flex-col">
      <div className="rewards-aurora" />

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
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -mr-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2 flex flex-col gap-3 animate-fade-in">
        {/* Balance hero — the only "money" display kept on the main screen */}
        <section
          className={cn(
            'shrink-0 rounded-2xl p-3.5 backdrop-blur-xl shadow-float text-center transition-all duration-300 border',
            tapTier >= 3 ? 'bg-gradient-to-br from-orange-500/25 via-card/60 to-red-500/15 border-orange-400/70' :
            tapTier >= 1 ? 'bg-card/60 border-amber-400/50' :
            'bg-card/60 gold-border',
          )}
          style={tapTier >= 1 ? {
            boxShadow: `0 0 ${16 + tapTier * 14}px rgba(251,146,60,${0.12 + tapTier * 0.09})`,
          } : undefined}
        >
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
            Total Units Mined
            {tapTier >= 2 && <Flame className={cn('w-3 h-3', tapTier >= 4 ? 'text-red-500' : 'text-orange-400')} style={{ animation: 'flameFlicker 0.5s ease-in-out infinite' }} />}
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

        {/* Only the tap button lives here now — everything else moved to the sidebar */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2">
          <TapSection t={t} per={per} onTierChange={setTapTier} />
        </div>
      </main>

      <div className="shrink-0">
        <BottomNav />
      </div>

      {/* Sidebar (slide in from the right) */}
      <div
        className={cn(
          'fixed inset-0 z-[90] transition-opacity duration-300',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!sidebarOpen}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        <aside
          className={cn(
            'absolute right-0 top-0 h-[100dvh] w-[82%] max-w-xs bg-background border-l border-border/50 shadow-2xl transition-transform duration-300 flex flex-col',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-border/50">
            <p className="text-sm font-display font-bold gold-text">Menu</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 -mr-2 rounded-xl hover:bg-muted transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-2">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => openModal(item.id)}
                  className="w-full flex items-center gap-3 rounded-2xl p-3 bg-card/60 backdrop-blur-md gold-border text-left active:scale-[0.98] transition-transform"
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl gold-surface text-black grid place-items-center">
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{item.description}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Full-screen modal for the selected sidebar section */}
      <FullScreenModal
        open={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={MENU_ITEMS.find((m) => m.id === activeModal)?.label ?? ''}
        icon={MENU_ITEMS.find((m) => m.id === activeModal)?.icon}
      >
        {activeModal === 'upgrade' && <UpgradeSection t={t} wallet={wallet} refetchWallet={refetchWallet} />}
        {activeModal === 'rewards' && <RewardsSection t={t} refetchWallet={refetchWallet} />}
        {activeModal === 'top' && <LeaderboardSection />}
        {activeModal === 'history' && <HistorySection />}
      </FullScreenModal>
    </div>
  );
};

/* ─────────── Full-screen modal shell ───────────
   Fixed to the viewport (100dvh) with its own internal scroll region, so it
   can never overlay or get overlapped by the bottom nav / tab bar again. */
const FullScreenModal = ({
  open, onClose, title, icon: Icon, children,
}: {
  open: boolean; onClose: () => void; title: string; icon?: typeof Coins; children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] h-[100dvh] bg-background flex flex-col transition-transform duration-300',
        open ? 'translate-y-0' : 'translate-y-full pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div className="rewards-aurora" />
      <header className="relative z-10 shrink-0 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <span className="flex items-center gap-2 text-sm font-bold">
            {Icon && (
              <span className="w-7 h-7 rounded-lg gold-surface text-black grid place-items-center">
                <Icon className="w-3.5 h-3.5" />
              </span>
            )}
            {title}
          </span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg w-full mx-auto px-4 pt-3 pb-8">
          {open && children}
        </div>
      </div>
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
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px) rotate(-1deg); }
      75% { transform: translateX(2px) rotate(1deg); }
    }
  `}</style>
);

/* Combo tiers: how many rapid taps (within 650ms of each other) unlock each stage */
const COMBO_TIERS = [
  { min: 0, label: '', ring: '' },
  { min: 12, label: 'Warm', ring: 'rgba(251,191,36,0.35)' },
  { min: 30, label: 'Heating Up', ring: 'rgba(251,146,60,0.45)' },
  { min: 60, label: 'Blazing', ring: 'rgba(249,115,22,0.55)' },
  { min: 110, label: 'INFERNO', ring: 'rgba(239,68,68,0.65)' },
];
const getTier = (combo: number) => {
  let tier = 0;
  for (let i = 0; i < COMBO_TIERS.length; i++) if (combo >= COMBO_TIERS[i].min) tier = i;
  return tier;
};

/* ─────────── TAP ─────────── */
const TapSection = ({ t, per, onTierChange }: {
  t: ReturnType<typeof useTapEarn>; per: number; onTierChange?: (tier: number) => void;
}) => {
  const [combo, setCombo] = useState(0);
  const [pops, setPops] = useState<{ id: number; label: string }[]>([]);
  const [sparks, setSparks] = useState<{ id: number; tx: number; ty: number }[]>([]);
  const lastTapAt = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  const seedRef = useRef(0);
  const tier = getTier(combo);
  const tierMeta = COMBO_TIERS[tier];

  useEffect(() => {
    onTierChange?.(tier);
  }, [tier, onTierChange]);

  useEffect(() => () => resetTimer.current && clearTimeout(resetTimer.current), []);

  const handleTap = () => {
    const now = Date.now();
    const gap = now - lastTapAt.current;
    lastTapAt.current = now;
    const nextCombo = gap < 650 ? combo + 1 : 1;
    setCombo(nextCombo);

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCombo(0), 900);

    // floating "+amount" pop
    const id = ++seedRef.current;
    setPops((p) => [...p.slice(-4), { id, label: `+${formatUnits(per, 7)}` }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 650);

    // spark burst on every tier level-up
    const justLeveled = getTier(nextCombo) > getTier(nextCombo - 1);
    if (justLeveled && getTier(nextCombo) >= 2) {
      const burst = Array.from({ length: 8 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 8;
        return {
          id: ++seedRef.current,
          tx: Math.cos(angle) * 48,
          ty: Math.sin(angle) * 48,
        };
      });
      setSparks((s) => [...s, ...burst]);
      setTimeout(() => setSparks((s) => s.filter((sp) => !burst.some((b) => b.id === sp.id))), 550);
    }

    t.tap();
  };

  return (
    <div className="space-y-5">
      <ComboKeyframes />

      {/* Combo badge */}
      <div className="flex items-center justify-center h-5">
        {tier > 0 && (
          <span
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide',
              tier >= 3 ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-amber-400/20 text-amber-400',
            )}
            style={{ animation: tier >= 2 ? 'flameFlicker 0.5s ease-in-out infinite' : undefined }}
          >
            <Flame className="w-3.5 h-3.5" />
            {tierMeta.label} • x{combo}
          </span>
        )}
      </div>

      {/* Coin + fire ring + floating pops + sparks, all self-contained overlay */}
      <div className="relative flex items-center justify-center">
        {tier >= 1 && (
          <span
            key={`ring-${combo}`}
            className="absolute inset-0 m-auto w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${tierMeta.ring} 0%, transparent 70%)`,
              animation: 'ringPulse 0.7s ease-out',
            }}
          />
        )}
        {sparks.map((s) => (
          <span
            key={s.id}
            className={cn('absolute w-1.5 h-1.5 rounded-full pointer-events-none', tier >= 3 ? 'bg-red-500' : 'bg-amber-400')}
            style={{ ['--tx' as any]: `${s.tx}px`, ['--ty' as any]: `${s.ty}px`, animation: 'sparkBurst 0.55s ease-out forwards' }}
          />
        ))}
        {pops.map((p) => (
          <span
            key={p.id}
            className={cn(
              'absolute top-0 left-1/2 text-xs font-black tabular-nums pointer-events-none',
              tier >= 3 ? 'text-red-400' : tier >= 1 ? 'text-orange-400' : 'text-amber-400',
            )}
            style={{ animation: 'popFloat 0.65s ease-out forwards' }}
          >
            {p.label}
          </span>
        ))}
        <div style={{ animation: tier >= 3 ? 'coinShake 0.25s ease-in-out infinite' : undefined }}>
          <TapCoin onTap={handleTap} rewardLabel={formatUnits(per, 7)} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground -mt-2">
        Tap fast — every tap is counted & verified {t.syncing && '• syncing…'}
      </p>
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
