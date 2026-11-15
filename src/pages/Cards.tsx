import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, CircleAlert, Clock3, Layers3, Plus, RefreshCw, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/BottomNav';
import { CardArtwork } from '@/components/cards/CardArtwork';
import { TradeConfirmDialog } from '@/components/cards/TradeConfirmDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCardCatalog, useCardHoldings, useCardRealtime, useCardTradeActions, useCardWallet } from '@/hooks/useCardMarket';
import type { CardCatalogRow, CardHoldingRow } from '@/integrations/supabase/card-trading-types';
import { formatLeCredits } from '@/lib/card-currency';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EMPTY_CARDS: CardCatalogRow[] = [];
const EMPTY_HOLDINGS: CardHoldingRow[] = [];

export default function Cards() {
  const navigate = useNavigate();
  const catalogQuery = useCardCatalog();
  const holdingsQuery = useCardHoldings();
  const walletQuery = useCardWallet();
  const { sellCard, isSelling } = useCardTradeActions();
  useCardRealtime();

  const [view, setView] = useState<'owned' | 'history'>('owned');
  const [sellTarget, setSellTarget] = useState<{ holding: CardHoldingRow; card: CardCatalogRow } | null>(null);
  const [sellRequestId, setSellRequestId] = useState<string | null>(null);
  const cardsById = useMemo(() => new Map((catalogQuery.data ?? EMPTY_CARDS).map((card) => [card.id, card])), [catalogQuery.data]);
  const holdings = holdingsQuery.data ?? EMPTY_HOLDINGS;
  const owned = holdings.filter((holding) => holding.status === 'owned');
  const sold = holdings.filter((holding) => holding.status === 'sold');
  const ownedValue = owned.reduce((sum, holding) => sum + (cardsById.get(holding.card_id)?.current_price ?? holding.purchase_price), 0);
  const costBasis = owned.reduce((sum, holding) => sum + holding.purchase_price, 0);
  const unrealized = owned.reduce((sum, holding) => sum + (cardsById.get(holding.card_id)?.current_price ?? holding.purchase_price) - holding.purchase_price, 0);
  const realized = sold.reduce((sum, holding) => sum + (Number(holding.sold_price ?? 0) - holding.purchase_price), 0);
  const selectedList = view === 'owned' ? owned : sold;
  const isLoading = catalogQuery.isLoading || holdingsQuery.isLoading;
  const currentSellCard = sellTarget ? cardsById.get(sellTarget.card.id) ?? sellTarget.card : null;

  const startSale = (holding: CardHoldingRow, card: CardCatalogRow) => {
    setSellTarget({ holding, card });
    setSellRequestId(crypto.randomUUID());
  };

  const cancelSale = () => {
    setSellTarget(null);
    setSellRequestId(null);
  };

  const confirmSale = async () => {
    if (!sellTarget || !sellRequestId) return;
    try {
      const result = await sellCard(sellTarget.holding.id, sellRequestId);
      cancelSale();
      toast({
        title: 'Card sold',
        description: `${sellTarget.card.title} sold for ${formatLeCredits(result.unit_price)} · ${formatLeCredits(result.profit_loss, true)} simulated change · balance ${formatLeCredits(result.balance)}.`,
      });
    } catch (error) {
      toast({
        title: 'Sale could not be completed',
        description: error instanceof Error ? error.message : 'The live quote may have changed. Refresh your collection and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-28 pt-5 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" aria-label="Back to market" className="h-10 w-10 rounded-xl" onClick={() => navigate('/market')}><ArrowLeft className="h-4 w-4" /></Button>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15"><Layers3 className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Your collection</p>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">My cards</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-border/70 bg-card px-3 py-2 sm:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Simulated balance</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold tabular-nums"><Wallet className="h-3.5 w-3.5 text-primary" />{formatLeCredits(Number(walletQuery.data?.balance ?? 0))}</p>
            </div>
            <Button type="button" size="sm" className="rounded-xl" onClick={() => navigate('/market')}><Plus className="h-4 w-4" /> Browse cards</Button>
            <ThemeToggle />
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-primary/[0.12] via-card to-accent/[0.08] p-5 shadow-[var(--shadow-card)] sm:p-7">
          <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <Badge className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">COLLECT · TRACK · TRADE</Badge>
              <h2 className="mt-4 max-w-xl font-display text-3xl font-black tracking-tight sm:text-4xl">Your cards, all in one place.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">See each fictional card’s serial, purchase quote, latest market quote, and simulated change. Sell owned cards at the server’s live quote.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="min-w-[115px] rounded-2xl border border-border/70 bg-background/60 p-3.5 backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Owned cards</p>
                <p className="mt-1 font-display text-2xl font-black tabular-nums">{holdingsQuery.isLoading ? '—' : owned.length}</p>
              </div>
              <div className="min-w-[115px] rounded-2xl border border-border/70 bg-background/60 p-3.5 backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Current value</p>
                <p className="mt-1 font-display text-lg font-black tabular-nums sm:text-xl">{formatLeCredits(ownedValue)}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-border/70 bg-background/60 p-3.5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">Unrealized change</span>
                  <span className={cn('inline-flex items-center gap-1 text-sm font-extrabold tabular-nums', unrealized >= 0 ? 'text-success' : 'text-destructive')}>
                    {unrealized >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{formatLeCredits(unrealized, true)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                  <span>Owned cost basis</span><span className="font-semibold tabular-nums">{formatLeCredits(costBasis)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {walletQuery.isError && <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 text-sm text-muted-foreground">Your simulated-credit balance is temporarily unavailable. Your cards remain visible.</div>}
        {holdingsQuery.isError && <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-4 text-sm text-muted-foreground">Your card records could not load. Please refresh the page or try again in a moment.</div>}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">Collection</h2>
              <p className="mt-1 text-xs text-muted-foreground">Cards and trade history are private to your account.</p>
            </div>
            <div className="inline-flex rounded-xl border border-border/70 bg-card p-1">
              <button type="button" aria-pressed={view === 'owned'} onClick={() => setView('owned')} className={cn('rounded-lg px-3.5 py-2 text-xs font-bold transition-colors', view === 'owned' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Owned <span className="ml-1 opacity-75">{owned.length}</span></button>
              <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')} className={cn('rounded-lg px-3.5 py-2 text-xs font-bold transition-colors', view === 'history' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Sold history <span className="ml-1 opacity-75">{sold.length}</span></button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-56 rounded-[1.4rem]" />)}
            </div>
          ) : selectedList.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/50 px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Layers3 className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-extrabold">{view === 'owned' ? 'Your collection is ready for its first card' : 'No sold cards yet'}</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{view === 'owned' ? 'Explore the fictional card market, check live quotes, and buy with simulated Le credits.' : 'Cards you sell will appear here with their sale quote and realized simulated change.'}</p>
              {view === 'owned' && <Button type="button" className="mt-4 rounded-xl" onClick={() => navigate('/market')}>Explore the market <ArrowUpRight className="h-4 w-4" /></Button>}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {selectedList.map((holding) => {
                const card = cardsById.get(holding.card_id);
                if (!card) return null;
                const currentValue = holding.status === 'owned' ? card.current_price : Number(holding.sold_price ?? 0);
                const change = currentValue - holding.purchase_price;
                const available = holding.status === 'owned' && card.status === 'active' && !card.market_paused;
                return (
                  <article key={holding.id} className="grid gap-4 rounded-[1.4rem] border border-border/70 bg-card p-3.5 shadow-[var(--shadow-card)] sm:grid-cols-[minmax(10rem,0.75fr)_minmax(0,1.25fr)] sm:p-4">
                    <CardArtwork card={card} compact className="w-full" />
                    <div className="flex min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-extrabold">{card.title}</h3>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{card.code} · {card.category.replace('_', ' ')}</p>
                        </div>
                        <Badge variant={holding.status === 'owned' ? 'secondary' : 'outline'} className="shrink-0">{holding.status === 'owned' ? 'Owned' : 'Sold'}</Badge>
                      </div>
                      <div className="mt-3 rounded-xl bg-muted/30 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Collectible serial</p>
                        <p className="mt-0.5 break-all font-mono text-xs font-bold tracking-wide">{holding.serial_code}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Bought for</p><p className="mt-1 text-sm font-bold tabular-nums">{formatLeCredits(holding.purchase_price)}</p></div>
                        <div><p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{holding.status === 'owned' ? 'Live quote' : 'Sold for'}</p><p className="mt-1 text-sm font-bold tabular-nums">{formatLeCredits(currentValue)}</p></div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                        <span className="text-[10px] text-muted-foreground">{holding.status === 'owned' ? 'Unrealized' : 'Realized'} change</span>
                        <span className={cn('text-xs font-extrabold tabular-nums', change >= 0 ? 'text-success' : 'text-destructive')}>{formatLeCredits(change, true)}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(holding.status === 'owned' ? holding.purchased_at : holding.sold_at ?? holding.purchased_at).toLocaleDateString()}</span>
                        {holding.status === 'owned' ? (
                          <Button type="button" size="sm" variant={available ? 'outline' : 'secondary'} className="h-9 rounded-xl" disabled={!available} onClick={() => startSale(holding, card)}>
                            {card.market_paused ? 'Market paused' : card.status !== 'active' ? 'Unavailable' : 'Sell card'}
                          </Button>
                        ) : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"><BadgeCheck className="h-3 w-3" /> Sale complete</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {sold.length > 0 && view === 'owned' && (
          <button type="button" onClick={() => setView('history')} className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30">
            <span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground"><RefreshCw className="h-4 w-4" /></span><span><span className="block text-sm font-bold">Sold cards</span><span className="mt-0.5 block text-xs text-muted-foreground">Realized simulated change: {formatLeCredits(realized, true)}</span></span></span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <footer className="flex items-start gap-2.5 rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>Market quotes can decrease. Current value and P/L are estimates using the latest stored quote; the backend’s quote at sale time determines proceeds. Simulated Le credits and collectibles have no cash value and cannot be withdrawn or redeemed.</p>
        </footer>
      </main>

      <TradeConfirmDialog
        open={Boolean(sellTarget)}
        onOpenChange={(open) => { if (!open) cancelSale(); }}
        mode="sell"
        cardTitle={sellTarget?.card.title ?? ''}
        cardCode={sellTarget?.card.code ?? ''}
        quote={currentSellCard?.current_price ?? sellTarget?.card.current_price ?? 0}
        balance={Number(walletQuery.data?.balance ?? 0)}
        isPending={isSelling}
        onConfirm={() => void confirmSale()}
      />
      <BottomNav />
    </>
  );
}
