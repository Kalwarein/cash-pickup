import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronDown, Coins, Flame, Gauge, Trophy, History as HistoryIcon,
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

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

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
  const ActiveIcon = activeTabMeta.icon;

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
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
            {t.online ? <Wifi className="w-3.5 h-3.5 text-success" /> : <WifiOff className="w-3.5 h-3.5 text-destructive" />}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2 flex flex-col gap-3 animate-fade-in">
        {/* Balance hero */}
        <section className="shrink-0 rounded-2xl p-3.5 gold-border bg-card/60 backdrop-blur-xl shadow-float text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Total Units Mined</p>
          <AnimatedNumber
            value={t.displayUnits}
            decimals={8}
            duration={350}
            className="block text-2xl font-display font-black gold-text tabular-nums leading-tight"
          />
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
              <div className="h-full gold-surface transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground text-right">
              ~<AnimatedNumber value={remainingTaps} compact className="tabular-nums" /> taps left
            </p>
          </div>
        </section>

        {/* Expandable dashboard toolbar */}
        <div className="relative shrink-0 z-20">
          {!toolbarOpen ? (
            <button
              onClick={() => setToolbarOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-muted/60 backdrop-blur-sm gold-border active:scale-[0.99] transition-transform"
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <span className="w-6 h-6 rounded-lg gold-surface text-black grid place-items-center">
                  <ActiveIcon className="w-3.5 h-3.5" />
                </span>
                {activeTabMeta.label}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                Switch
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : (
            <div className="rounded-2xl bg-muted/60 backdrop-blur-sm gold-border p-1 animate-fade-in">
              <div className="flex gap-1">
                {TABS.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => { setTab(tb.id); setToolbarOpen(false); }}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-semibold transition-all',
                        active ? 'gold-surface text-black shadow' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tb.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setToolbarOpen(false)}
                className="w-full mt-1 py-1 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse
              </button>
            </div>
          )}
        </div>

        {/* Scrollable tab content — only this area scrolls, the shell never does */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2">
          {tab === 'tap' && <TapSection t={t} per={per} />}
          {tab === 'upgrade' && <UpgradeSection t={t} wallet={wallet} refetchWallet={refetchWallet} />}
          {tab === 'rewards' && <RewardsSection t={t} refetchWallet={refetchWallet} />}
          {tab === 'top' && <LeaderboardSection />}
          {tab === 'history' && <HistorySection />}
        </div>
      </main>

      <div className="shrink-0">
        <BottomNav />
      </div>
    </div>
  );
};

/* ─────────── TAP ─────────── */
const TapSection = ({ t, per }: { t: ReturnType<typeof useTapEarn>; per: number }) => {
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
      <TapCoin onTap={t.tap} rewardLabel={formatUnits(per, 7)} />
      <p className="text-center text-xs text-muted-foreground -mt-2">
        Tap fast — every tap is counted & verified {t.syncing && '• syncing…'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-3 bg-card/60 backdrop-blur-md gold-border">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Icon className="w-3 h-3 text-amber-400" /> {s.label}
              </div>
              <p className="text-sm font-bold tabular-nums truncate">{s.value}</p>
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
