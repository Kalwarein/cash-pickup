import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Gauge, Zap, Wallet, Flame, Pickaxe, Lock, Check,
  ChevronRight, Activity, Hash,
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

const HEAT_STYLE: Record<HeatLevel, { text: string; dot: string }> = {
  normal: { text: 'text-sky-400', dot: 'bg-sky-400' },
  warm: { text: 'text-amber-400', dot: 'bg-amber-400' },
  hot: { text: 'text-orange-400', dot: 'bg-orange-400' },
  'very-hot': { text: 'text-red-400', dot: 'bg-red-400' },
  max: { text: 'text-red-500', dot: 'bg-red-500' },
};

const Mine = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet } = useWallet();
  const t = useTapEarn();
  const [leverageOpen, setLeverageOpen] = useState(false);
  const [sessionTaps, setSessionTaps] = useState(0);
  const [heat, setHeat] = useState({ heat: 0, level: 'normal' as HeatLevel, combo: 0 });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const per = rewardPerTap(t.profile.leverage_level);
  const progressPct = Math.min(100, ((t.displayUnits % 1) / 1) * 100);

  const handleTap = useCallback(() => {
    t.tap();
    setSessionTaps((n) => n + 1);
  }, [t]);

  const handleState = useCallback((s: { heat: number; level: HeatLevel; combo: number }) => {
    setHeat(s);
  }, []);

  const unlock = useCallback((level: number, cost: number) => {
    localStorage.setItem('mine_pending_leverage', String(level));
    navigate(`/wallet?deposit=1&amount=${cost}&leverage=${level}`);
  }, [navigate]);

  const heatStyle = HEAT_STYLE[heat.level];

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
      <div className="mine-page-bg" style={{ ['--mine-heat' as string]: heat.heat, ['--mine-heat-h' as string]: heat.level === 'normal' ? 210 : 40 }} />
      <div className="rewards-aurora" />

      {/* Header */}
      <header className="relative z-20 shrink-0 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Pickaxe className="w-4 h-4 text-amber-400" />
            <h1 className="text-base font-display font-bold gold-text">Mine</h1>
          </div>
          <button
            onClick={() => setLeverageOpen(true)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl gold-border bg-card/60 text-xs font-bold text-amber-400 active:scale-95 transition-transform"
          >
            <Zap className="w-3.5 h-3.5" /> {leverageMult(t.profile.leverage_level)}x
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2 flex flex-col animate-fade-in">
        {/* Balance hero */}
        <section className="shrink-0 rounded-2xl p-3.5 bg-card/60 backdrop-blur-xl gold-border shadow-float text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Total Units Mined</p>
          <AnimatedNumber
            value={t.displayUnits}
            decimals={8}
            duration={350}
            className="block text-[26px] leading-tight font-display font-black tabular-nums gold-text"
          />
          <div className="mt-2 flex items-center justify-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> {sle(wallet?.balance ?? 0)}
            </span>
            <span className={cn('flex items-center gap-1 font-semibold', heatStyle.text)}>
              <span className={cn('w-2 h-2 rounded-full', heatStyle.dot)} /> {HEAT_LABEL[heat.level]}
            </span>
          </div>
          <div className="mt-2.5 text-left">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progress to next unit</span>
              <span>{progressPct.toFixed(2)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full gold-surface transition-[width] duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </section>

        {/* Combo badge + button */}
        <div className="flex-1 min-h-0 grid place-items-center relative">
          {heat.combo >= 5 && (
            <span
              className={cn(
                'absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wide',
                heat.level === 'max' || heat.level === 'very-hot'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  : 'bg-amber-400/20 text-amber-400',
              )}
            >
              <Flame className="w-3.5 h-3.5" /> Combo x{heat.combo}
            </span>
          )}
          <MineButton onTap={handleTap} rewardLabel={formatUnits(per, 7)} onState={handleState} />
        </div>

        {/* Live stats row */}
        <section className="shrink-0 grid grid-cols-3 gap-2 mb-1">
          <Stat icon={<Zap className="w-3.5 h-3.5" />} label="Rate / tap" value={formatUnits(per, 7)} />
          <Stat icon={<Hash className="w-3.5 h-3.5" />} label="Total taps" value={<AnimatedNumber value={t.displayTaps} compact className="tabular-nums" />} />
          <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Session" value={<AnimatedNumber value={sessionTaps} compact className="tabular-nums" />} />
        </section>

        <button
          onClick={() => setLeverageOpen(true)}
          className="shrink-0 w-full flex items-center justify-between rounded-2xl p-3 gold-surface text-black font-bold text-sm active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> Boost Mining Power</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </main>

      <div className="shrink-0"><BottomNav /></div>

      {/* Leverage drawer */}
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

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="rounded-xl bg-card/60 backdrop-blur-md border border-border/50 p-2.5 text-center">
    <span className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
      <span className="text-amber-400">{icon}</span> {label}
    </span>
    <span className="block mt-0.5 text-sm font-bold tabular-nums">{value}</span>
  </div>
);

const LeverageCard = ({ tier, current, balance, onUnlock }: {
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
};

export default Mine;
