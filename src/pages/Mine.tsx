import { useCallback, useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Lock, Check, MoreVertical, ArrowRightLeft,
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { useTapEarn } from '@/hooks/useTapEarn';
import { MineButton } from '@/components/mine/MineButton';
import { AnimatedNumber } from '@/components/tap/AnimatedNumber';
import {
  LEVERAGE, rewardPerTap, leverageMult, formatUnits, BASE_REWARD,
  streakProgress, tapIntensity,
} from '@/lib/tapEarn';
import { sle } from '@/lib/currency';
import { cn } from '@/lib/utils';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { notify } from '@/lib/notify';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';

const MIN_TRANSFER = 20.99;

const Mine = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { wallet, refetch: refetchWallet } = useWallet();
  const t = useTapEarn();
  const [leverageOpen, setLeverageOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  const per = rewardPerTap(t.profile.leverage_level);
  const progressPct = Math.min(100, ((t.displayUnits % 1) / 1) * 100);
  const streakInfo = streakProgress(t.streak);
  const intensity = tapIntensity(t.streak);

  const balance = wallet?.balance ?? 0;
  const canMine = balance >= 50;

  const handleTap = useCallback(() => {
    if (!canMine) {
      navigate('/wallet?deposit=1&amount=50');
      return;
    }
    t.tap();
  }, [t, canMine, navigate]);

  const openLeverage = useCallback(() => setLeverageOpen(true), []);
  const goHome = useCallback(() => navigate('/home'), [navigate]);
  const openTransfer = useCallback(() => {
    setMenuOpen(false);
    setTransferOpen(true);
  }, []);

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

      <Header
        multiplier={leverageMult(t.profile.leverage_level)}
        onBack={goHome}
        onLeverage={openLeverage}
        menuOpen={menuOpen}
        onMenuChange={setMenuOpen}
        onTransfer={openTransfer}
      />

      <main className="relative z-10 flex-1 min-h-0 max-w-lg w-full mx-auto px-4 pt-3 pb-3 flex flex-col gap-3 animate-fade-in">
        <BalanceHero
          displayUnits={t.displayUnits}
          walletBalance={wallet?.balance ?? 0}
          progressPct={progressPct}
          multiplier={streakInfo.mult}
        />

        <TapArea
          onTap={handleTap}
          rewardLabel={formatUnits(per, 8)}
          streak={t.streak}
          multiplier={streakInfo.mult}
          nextAt={streakInfo.next}
          stepPct={streakInfo.pct}
          intensity={intensity}
          locked={!canMine}
          onUnlock={() => navigate('/wallet?deposit=1&amount=50')}
        />
      </main>

      <div className="relative z-10 shrink-0"><BottomNav /></div>

      <Drawer open={leverageOpen} onOpenChange={setLeverageOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Leverage Tiers</DrawerTitle>
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

      <TransferDrawer
        open={transferOpen}
        onOpenChange={setTransferOpen}
        available={t.displayUnits}
        onTransfer={async (amount) => {
          const res = await t.transferToWallet(amount);
          if (res.error) {
            notify({ title: 'Transfer failed', body: res.error, tone: 'error' });
            return false;
          }
          await refetchWallet();
          notify({
            title: 'Transfer successful',
            body: `${sle(amount)} moved to your wallet.`,
            tone: 'success',
          });
          return true;
        }}
      />
    </div>
  );
};

/* ─────────── Header (memoized — only re-renders when multiplier changes) ─────────── */
const Header = memo(({ multiplier, onBack, onLeverage, menuOpen, onMenuChange, onTransfer }: {
  multiplier: number;
  onBack: () => void;
  onLeverage: () => void;
  menuOpen: boolean;
  onMenuChange: (v: boolean) => void;
  onTransfer: () => void;
}) => (
  <header className="relative z-20 shrink-0 backdrop-blur-md bg-background/70 border-b border-border/50">
    <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-12">
      <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-muted active:scale-90 transition-transform">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <h1 className="text-base font-display font-bold mn-brand-text">Earn</h1>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onLeverage}
          className="flex items-center gap-1.5 px-2.5 h-8 rounded-xl mn-brand-border bg-card/60 text-xs font-bold text-primary active:scale-95 transition-transform"
        >
          {multiplier}x
        </button>
        <Popover open={menuOpen} onOpenChange={onMenuChange}>
          <PopoverTrigger asChild>
            <button className="p-1.5 rounded-xl hover:bg-muted active:scale-90 transition-transform" aria-label="More options">
              <MoreVertical className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1.5 bg-card/95 backdrop-blur-xl border-border/60 shadow-float">
            <button
              onClick={onTransfer}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold hover:bg-muted active:scale-[0.98] transition-all"
            >
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Transfer to Wallet
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  </header>
));
Header.displayName = 'Header';

/* ─────────── Transfer drawer ─────────── */
const TransferDrawer = ({ open, onOpenChange, available, onTransfer }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: number;
  onTransfer: (amount: number) => Promise<boolean>;
}) => {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const num = Number(amount);
  const canTransfer = available >= MIN_TRANSFER && num >= MIN_TRANSFER && num <= available;

  useEffect(() => {
    if (!open) { setAmount(''); setBusy(false); }
  }, [open]);

  const submit = async () => {
    if (!canTransfer || busy) return;
    setBusy(true);
    const ok = await onTransfer(Number(num.toFixed(2)));
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Transfer to Wallet</DrawerTitle>
          <DrawerDescription>
            Move your mined balance into your main wallet as SLE. Minimum transfer is {sle(MIN_TRANSFER)}.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-4">
          <div className="rounded-2xl p-4 mn-brand-border bg-primary/5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Available to transfer</p>
            <p className="text-2xl font-display font-black mn-brand-text tabular-nums">{formatUnits(available, 5)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">1 unit = SLE 1.00</p>
          </div>

          {available < MIN_TRANSFER ? (
            <div className="rounded-xl p-3 bg-destructive/10 border border-destructive/30 text-xs text-destructive">
              You need at least <span className="font-bold">{formatUnits(MIN_TRANSFER, 2)}</span> mined units to transfer.
              Keep mining!
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Amount (SLE)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={MIN_TRANSFER}
                    max={available}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${MIN_TRANSFER.toFixed(2)}`}
                    className="flex-1 h-12 px-4 rounded-xl bg-muted/40 border border-border/60 text-lg font-bold tabular-nums outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    onClick={() => setAmount(available.toFixed(2))}
                    className="h-12 px-3 rounded-xl mn-brand-border bg-card/60 text-xs font-bold text-primary active:scale-95 transition-transform"
                  >
                    MAX
                  </button>
                </div>
                {num > 0 && num < MIN_TRANSFER && (
                  <p className="mt-1.5 text-[11px] text-destructive">Minimum is {MIN_TRANSFER.toFixed(2)}.</p>
                )}
                {num > available && (
                  <p className="mt-1.5 text-[11px] text-destructive">Exceeds available balance.</p>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!canTransfer || busy}
                className={cn(
                  'w-full h-12 rounded-xl font-bold text-sm transition-all',
                  canTransfer && !busy
                    ? 'mn-brand-surface text-primary-foreground active:scale-[0.98] shadow-float'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {busy ? 'Transferring…' : `Transfer ${num > 0 ? sle(num) : ''}`}
              </button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

/* ─────────── Balance hero — luxury glass panel with iridescent edge ─────────── */
const BalanceHero = memo(({ displayUnits, walletBalance, progressPct, multiplier }: {
  displayUnits: number; walletBalance: number; progressPct: number; multiplier: number;
}) => {
  return (
    <section className="mn-hero shrink-0 rounded-3xl p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Units Mined</p>
      <AnimatedNumber
        value={displayUnits}
        decimals={9}
        duration={280}
        className="block text-[26px] leading-tight font-display font-black tabular-nums mn-iri-text"
      />
      <div className="mt-2 flex items-center justify-center gap-3 text-xs">
        <span className="text-muted-foreground tabular-nums">{sle(walletBalance)}</span>
        <span className={cn(
          'font-black px-2 py-0.5 rounded-full text-[11px] tabular-nums',
          multiplier > 1 ? 'mn-mult-chip' : 'bg-muted/50 text-muted-foreground',
        )}>×{multiplier}</span>
      </div>
      <div className="mt-3 text-left">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progress to next unit</span>
          <span className="tabular-nums">{progressPct.toFixed(2)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
          {/* transform (not width) — GPU-composited, buttery even at high tap rates */}
          <div
            className="h-full w-full origin-left mn-iri-bar"
            style={{ transform: `scaleX(${progressPct / 100})`, transition: 'transform 0.25s ease-out' }}
          />
        </div>
      </div>
    </section>
  );
});
BalanceHero.displayName = 'BalanceHero';

/* ─────────── Tap zone ─────────── */
const TapArea = ({ onTap, rewardLabel, streak, multiplier, nextAt, stepPct, intensity, locked, onUnlock }: {
  onTap: () => void; rewardLabel: string; streak: number; multiplier: number;
  nextAt: number; stepPct: number; intensity: number;
  locked?: boolean; onUnlock?: () => void;
}) => {
  return (
    <div className="flex-1 min-h-0 grid place-items-center relative mn-tap-zone">
      <StreakMeter streak={streak} multiplier={multiplier} nextAt={nextAt} stepPct={stepPct} />
      <MineButton onTap={onTap} rewardLabel={rewardLabel} intensity={intensity} multiplier={multiplier} />
      {locked && (
        <button
          onClick={onUnlock}
          className="absolute inset-0 z-30 grid place-items-center rounded-2xl bg-background/70 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl grid place-items-center mn-brand-surface text-primary-foreground">
              <Lock className="w-6 h-6" />
            </div>
            <p className="font-display font-bold text-base">Mining Locked</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Deposit or hold at least <span className="text-primary font-bold">{sle(50)}</span> in your wallet to start mining.
            </p>
            <span className="mt-1 px-4 py-2 rounded-xl mn-brand-surface text-primary-foreground text-sm font-bold active:scale-95 transition-transform">
              Deposit {sle(50)}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};

/* ─────────── Continuous-tap streak meter — sits above the orb.
   Only the streak count + a transform-driven bar change per tap, so this
   stays a single composited update no matter how fast you go. ─────────── */
const StreakMeter = memo(({ streak, multiplier, nextAt, stepPct }: {
  streak: number; multiplier: number; nextAt: number; stepPct: number;
}) => {
  if (streak < 3) return null;
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-[230px] text-center">
      <div className="flex items-center justify-center gap-2">
        <span key={multiplier} className="mn-mult-chip mn-combo-pop-static px-3 py-1 rounded-full text-[13px] font-black tabular-nums">
          ×{multiplier}
        </span>
        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{streak} streak</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full w-full origin-left mn-iri-bar"
          style={{ transform: `scaleX(${stepPct})`, transition: 'transform 0.18s linear' }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
        {Math.max(0, nextAt - streak)} more taps to ×{multiplier + 1}
      </p>
    </div>
  );
});
StreakMeter.displayName = 'StreakMeter';

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
      owned ? 'bg-primary/10 mn-brand-border' : 'bg-card/70 border border-border/50',
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-12 h-12 shrink-0 rounded-xl grid place-items-center font-black text-sm',
            owned ? 'mn-brand-surface text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}>
            {owned ? `${tier.mult}x` : <Lock className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm flex items-center gap-1.5">
              {tier.mult}x Power
              {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-semibold">ACTIVE</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatUnits(BASE_REWARD * tier.mult, 8)} / tap</p>
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
                className="mt-1 px-3 py-1.5 rounded-lg mn-brand-surface text-primary-foreground text-xs font-bold active:scale-95 transition-transform"
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
        radial-gradient(circle at 20% 8%, hsl(var(--primary) / 0.16) 0%, transparent 55%),
        radial-gradient(circle at 82% 26%, hsl(var(--accent) / 0.12) 0%, transparent 52%),
        radial-gradient(circle at 50% 98%, hsl(var(--primary-glow) / 0.10) 0%, transparent 58%),
        hsl(var(--background));
    }
    .mn-tap-zone {
      contain: layout paint style; touch-action: manipulation;
      -webkit-user-select: none; user-select: none;
    }

    .mn-brand-text {
      background: linear-gradient(100deg, hsl(var(--primary)), hsl(var(--accent)) 60%, hsl(var(--primary-glow)));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .mn-brand-surface {
      background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
    }
    .mn-brand-border { border: 1px solid hsl(var(--primary) / 0.35); }

    /* Glass hero in app palette */
    .mn-hero {
      position: relative;
      background: linear-gradient(160deg, hsl(var(--primary) / 0.10), hsl(var(--accent) / 0.04));
      border: 1px solid hsl(var(--primary) / 0.22);
      box-shadow: 0 18px 50px -22px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.08);
      transform: translateZ(0);
    }
    .mn-iri-text {
      background: linear-gradient(100deg, hsl(var(--primary-glow)), hsl(var(--foreground)) 45%, hsl(var(--accent)));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .mn-iri-bar {
      background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)) 60%, hsl(var(--primary-glow)));
      will-change: transform;
    }
    .mn-mult-chip {
      background: linear-gradient(120deg, hsl(var(--primary)), hsl(var(--accent)));
      color: hsl(var(--primary-foreground));
      box-shadow: 0 4px 14px -6px hsl(var(--primary) / 0.7), inset 0 1px 0 hsl(0 0% 100% / 0.3);
    }
    .mn-combo-pop-static { animation: mnComboPop 0.2s cubic-bezier(0.34,1.56,0.64,1); will-change: transform; }
    @keyframes mnComboPop {
      0% { transform: scale(0.72); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
      .mn-combo-pop-static { animation: none; }
    }
  `}</style>
);

export default Mine;
