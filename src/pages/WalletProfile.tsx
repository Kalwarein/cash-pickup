import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, BadgeCheck, Clock3, Coins, Layers3, LogOut, ShieldCheck, ShoppingBag, Sparkles, UserRound, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/BottomNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useCardHoldings, useCardLedger, useCardRealtime, useCardWallet } from '@/hooks/useCardMarket';
import { useProfile } from '@/hooks/useProfile';
import { formatLeCredits } from '@/lib/card-currency';
import { cn } from '@/lib/utils';

const eventLabel = (type: string) => {
  if (type === 'welcome_bonus') return 'Welcome credits';
  if (type === 'card_buy') return 'Card purchase';
  if (type === 'card_sell') return 'Card sale';
  return 'Card-market activity';
};

const WalletProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const walletQuery = useCardWallet();
  const holdingsQuery = useCardHoldings();
  const ledgerQuery = useCardLedger(12);
  useCardRealtime();

  const balance = Number(walletQuery.data?.balance ?? 0);
  const owned = (holdingsQuery.data ?? []).filter((holding) => holding.status === 'owned');
  const sold = (holdingsQuery.data ?? []).filter((holding) => holding.status === 'sold');
  const email = profile?.email || user?.email || 'Account email unavailable';
  const name = profile?.name || (typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '') || email.split('@')[0] || 'Card collector';
  const initial = name.trim().charAt(0).toLocaleUpperCase() || 'C';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <>
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-28 pt-5 sm:space-y-7 sm:px-6 sm:pt-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Cash Pickup</p>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Your account</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="relative overflow-hidden rounded-[1.8rem] border border-primary/20 bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-5 text-primary-foreground shadow-float sm:p-7">
          <span className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-black/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/25 bg-white/15 text-xl font-black shadow-sm backdrop-blur-sm">{initial}</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/65">Collector profile</p>
                  <h2 className="mt-0.5 truncate font-display text-xl font-extrabold sm:text-2xl">{name}</h2>
                  <p className="mt-1 max-w-[65vw] truncate text-xs text-white/75">{email}</p>
                </div>
              </div>
              <Badge className="border-white/25 bg-white/15 text-white hover:bg-white/15"><UserRound className="mr-1 h-3 w-3" /> Account</Badge>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="rounded-2xl border border-white/15 bg-black/15 p-4 backdrop-blur-sm sm:p-5">
                <p className="flex items-center gap-2 text-xs font-semibold text-white/70"><Wallet className="h-4 w-4" /> Simulated Le-credit balance</p>
                <p className="mt-2 font-display text-3xl font-black tabular-nums tracking-tight sm:text-4xl">{walletQuery.isLoading ? '—' : formatLeCredits(balance)}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/65">Promotional simulation credits only. No deposit, withdrawal, transfer, or cash redemption.</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="min-h-12 flex-1 rounded-xl border-0 bg-white text-slate-900 hover:bg-white/90 md:flex-none" onClick={() => navigate('/cards')}>
                  <Layers3 className="h-4 w-4" /> Cards <span className="rounded-full bg-slate-900/10 px-2 py-0.5 text-xs tabular-nums">{owned.length}</span>
                </Button>
                <Button type="button" variant="outline" className="min-h-12 flex-1 rounded-xl border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white md:flex-none" onClick={() => navigate('/market')}>
                  <ShoppingBag className="h-4 w-4" /> Market
                </Button>
              </div>
            </div>
          </div>
        </section>

        {(walletQuery.isError || holdingsQuery.isError || ledgerQuery.isError) && (
          <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
            Some card-market account data is unavailable. If the card migration has not been applied to Supabase yet, the balance, collection, and ledger will populate after deployment.
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Owned cards</span><Layers3 className="h-4 w-4 text-primary" /></div>
            <p className="mt-3 font-display text-2xl font-black tabular-nums">{holdingsQuery.isLoading ? '—' : owned.length}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Available to view in Cards</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Sold cards</span><BadgeCheck className="h-4 w-4 text-accent" /></div>
            <p className="mt-3 font-display text-2xl font-black tabular-nums">{holdingsQuery.isLoading ? '—' : sold.length}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Available in sold history</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Member since</span><ShieldCheck className="h-4 w-4 text-success" /></div>
            <p className="mt-3 font-display text-lg font-black">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">One account, one collection</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-display text-base font-extrabold">Credit activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">A record of simulated bonus credits and card trades</p>
            </div>
            <Coins className="h-5 w-5 text-primary" />
          </div>
          {ledgerQuery.isLoading ? (
            <div className="space-y-3 p-4 sm:p-5">{[0, 1, 2].map((key) => <Skeleton key={key} className="h-14 rounded-xl" />)}</div>
          ) : (ledgerQuery.data ?? []).length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-bold">No activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Your one-time bonus and card trades will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {(ledgerQuery.data ?? []).map((entry) => {
                const positive = entry.amount >= 0;
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', positive ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary')}>
                      {positive ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{eventLabel(entry.entry_type)}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{entry.description} · {new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                    <span className={cn('shrink-0 text-sm font-extrabold tabular-nums', positive ? 'text-success' : 'text-foreground')}>{formatLeCredits(entry.amount, true)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">A Le 15 welcome credit is awarded once by the card-market backend after your account signs in. It is a promotional simulation credit, not cash and not a stored-value wallet.</p>
          </div>
          <Button type="button" variant="outline" className="w-full rounded-xl text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto" onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </section>
      </main>
      <BottomNav />
    </>
  );
};

export default WalletProfile;
