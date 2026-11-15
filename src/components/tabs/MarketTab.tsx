import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowDownRight, ArrowUpRight, BadgeCheck, BarChart3, ChevronRight,
  CircleAlert, Clock3, Layers3, Search, Sparkles, Store, TrendingDown,
  TrendingUp, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { BottomNav } from '@/components/BottomNav';
import { CardArtwork } from '@/components/cards/CardArtwork';
import { CardPriceChart } from '@/components/cards/CardPriceChart';
import { MarketCardTile } from '@/components/cards/MarketCardTile';
import { TradeConfirmDialog } from '@/components/cards/TradeConfirmDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useCardCatalog, useCardHoldings, useCardPriceHistory, useCardRealtime, useCardTradeActions, useCardWallet } from '@/hooks/useCardMarket';
import type { CardCatalogRow, CardCategory, CardHoldingRow } from '@/integrations/supabase/card-trading-types';
import { formatLeCredits } from '@/lib/card-currency';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EMPTY_CARDS: CardCatalogRow[] = [];
const EMPTY_HOLDINGS: CardHoldingRow[] = [];

const categories: Array<{ value: 'all' | CardCategory; label: string }> = [
  { value: 'all', label: 'All cards' },
  { value: 'meme', label: 'Memes' },
  { value: 'company', label: 'Companies' },
  { value: 'fintech_collectible', label: 'Fintech' },
  { value: 'community', label: 'Community' },
];

const categoryLabel: Record<CardCategory, string> = {
  meme: 'Meme collectible',
  company: 'Fictional company collectible',
  fintech_collectible: 'Fintech collectible',
  community: 'Community collectible',
};

type SortMode = 'featured' | 'price-low' | 'price-high' | 'move';

export const MarketTab = () => {
  const navigate = useNavigate();
  const catalogQuery = useCardCatalog();
  const holdingsQuery = useCardHoldings();
  const walletQuery = useCardWallet();
  const { buyCard, isBuying } = useCardTradeActions();
  useCardRealtime();

  const [activeCategory, setActiveCategory] = useState<'all' | CardCategory>('all');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [buyTarget, setBuyTarget] = useState<CardCatalogRow | null>(null);
  const [buyRequestId, setBuyRequestId] = useState<string | null>(null);

  const cards = catalogQuery.data ?? EMPTY_CARDS;
  const holdings = holdingsQuery.data ?? EMPTY_HOLDINGS;
  const walletBalance = Number(walletQuery.data?.balance ?? 0);
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const historyQuery = useCardPriceHistory(selectedCardId ?? undefined);
  const history = historyQuery.data ?? [];

  const { filteredCards, ownedCounts, previouslyPurchased } = useMemo(() => {
    const owned = new Map<string, number>();
    const purchased = new Set<string>();
    for (const holding of holdings) {
      purchased.add(holding.card_id);
      if (holding.status === 'owned') owned.set(holding.card_id, (owned.get(holding.card_id) ?? 0) + 1);
    }

    const term = search.trim().toLocaleLowerCase();
    const visible = cards.filter((card) => {
      if (activeCategory !== 'all' && card.category !== activeCategory) return false;
      if (!term) return true;
      return [card.title, card.code, card.description, categoryLabel[card.category]]
        .some((value) => value.toLocaleLowerCase().includes(term));
    });

    visible.sort((a, b) => {
      if (sortMode === 'price-low') return a.current_price - b.current_price;
      if (sortMode === 'price-high') return b.current_price - a.current_price;
      if (sortMode === 'move') return Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent);
      if (a.is_limited !== b.is_limited) return a.is_limited ? -1 : 1;
      return Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent);
    });
    return { filteredCards: visible, ownedCounts: owned, previouslyPurchased: purchased };
  }, [activeCategory, cards, holdings, search, sortMode]);

  const featuredCard = cards.find((card) => card.is_limited && card.status === 'active' && !card.market_paused) ?? cards[0] ?? null;
  const risingCount = cards.filter((card) => card.price_change_percent > 0).length;
  const fallingCount = cards.filter((card) => card.price_change_percent < 0).length;
  const remainingForFeatured = featuredCard?.is_limited && featuredCard.buyer_limit !== null
    ? Math.max(0, featuredCard.buyer_limit - featuredCard.lifetime_buyer_count)
    : null;
  const selectedOwnedCount = selectedCard ? ownedCounts.get(selectedCard.id) ?? 0 : 0;
  const selectedPreviouslyPurchased = selectedCard ? previouslyPurchased.has(selectedCard.id) : false;
  const canBuySelected = Boolean(selectedCard)
    && selectedCard?.status === 'active'
    && !selectedCard.market_paused
    && !(selectedCard.is_limited && selectedPreviouslyPurchased)
    && !(selectedCard.is_limited && selectedCard.buyer_limit !== null && selectedCard.lifetime_buyer_count >= selectedCard.buyer_limit);
  const currentBuyTarget = buyTarget ? cards.find((card) => card.id === buyTarget.id) ?? buyTarget : null;
  const lastMarketTick = cards.reduce<string | null>((latest, card) =>
    card.last_tick_at && (!latest || card.last_tick_at > latest) ? card.last_tick_at : latest, null);
  const lastMarketTickLabel = lastMarketTick
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(lastMarketTick))
    : null;

  const openBuy = (card: CardCatalogRow) => {
    setBuyTarget(card);
    setBuyRequestId(crypto.randomUUID());
  };

  const cancelBuy = () => {
    setBuyTarget(null);
    setBuyRequestId(null);
  };

  const confirmBuy = async () => {
    if (!buyTarget || !buyRequestId) return;
    try {
      const result = await buyCard(buyTarget.id, buyRequestId);
      cancelBuy();
      toast({
        title: 'Card added to your collection',
        description: `${buyTarget.title} · ${result.serial_code ?? result.holding_id} · bought at ${formatLeCredits(result.unit_price)} · new quote ${formatLeCredits(result.price_after)} · balance ${formatLeCredits(result.balance)}.`,
      });
    } catch (error) {
      toast({
        title: 'Purchase could not be completed',
        description: error instanceof Error ? error.message : 'The live quote or your balance may have changed. Refresh and try again.',
        variant: 'destructive',
      });
    }
  };

  const movers = [...cards].sort((a, b) => Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent)).slice(0, 6);

  return (
    <>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-5 sm:space-y-8 sm:px-6 sm:pt-8 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Cash Pickup · Exchange</p>
              <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">The card market</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-border/70 bg-card/80 px-3.5 py-2.5 sm:flex">
              <span className={cn('h-2 w-2 rounded-full', lastMarketTick ? 'bg-success' : 'bg-warning')} />
              <span className="text-xs font-bold">{lastMarketTickLabel ? `Last tick ${lastMarketTickLabel}` : catalogQuery.isLoading ? 'Loading quotes' : 'Waiting for first price tick'}</span>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/cards')}>
              <Layers3 className="h-4 w-4" /> My cards
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="relative overflow-hidden rounded-[1.8rem] border border-border/70 bg-gradient-to-br from-primary/[0.12] via-card to-accent/[0.07] p-5 shadow-[var(--shadow-card)] sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.75fr)]">
              <div>
                <Badge className="border-success/20 bg-success/10 text-success hover:bg-success/10">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-success" /> SIMULATED MARKET
                </Badge>
                <h2 className="mt-4 max-w-xl font-display text-3xl font-black leading-[1.06] tracking-tight sm:text-4xl">
                  Collect the moment.<br /><span className="text-gradient">Trade the quote.</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Browse 30 fictional collectibles, follow their live quotes, and trade with simulated Le credits. Every quote can move up or down.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button type="button" className="rounded-xl" onClick={() => document.getElementById('card-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    Explore cards <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate('/cards')}>
                    View collection
                  </Button>
                </div>
                <p className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Fictional cards and non-redeemable credits only
                </p>
              </div>

              {featuredCard ? (
                <button type="button" onClick={() => setSelectedCardId(featuredCard.id)} className="group relative text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background">
                  <div className="absolute -inset-2 rounded-[1.5rem] bg-primary/10 blur-2xl transition-opacity group-hover:opacity-80" />
                  <div className="relative rotate-[1deg] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.02]">
                    <CardArtwork card={featuredCard} />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <span className="text-xs font-bold">Featured drop · {featuredCard.title}</span>
                      {remainingForFeatured !== null && <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[10px] font-bold backdrop-blur">{remainingForFeatured} spots remain</span>}
                    </div>
                  </div>
                </button>
              ) : catalogQuery.isLoading ? (
                <Skeleton className="aspect-[1.72] w-full rounded-[1.15rem]" />
              ) : (
                <div className="rounded-[1.5rem] border border-border/70 bg-card/70 p-6 text-center text-sm text-muted-foreground">
                  {catalogQuery.isError ? 'Featured card unavailable while the market reconnects.' : 'No featured card is available yet.'}
                </div>
              )}
            </div>
          </div>

          <aside className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-[1.4rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Layers3 className="h-4 w-4" /></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">My balance</span>
              </div>
              <p className="mt-4 font-display text-xl font-black tabular-nums tracking-tight sm:text-2xl">{walletQuery.isLoading ? '—' : formatLeCredits(walletBalance)}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Simulated Le credits · no cash value</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><Activity className="h-4 w-4" /></span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Market breadth</span>
              </div>
              <p className="mt-4 font-display text-xl font-black tracking-tight sm:text-2xl">{catalogQuery.isLoading ? '—' : `${risingCount} rising · ${fallingCount} falling`}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Based on each card’s latest recorded quote change</p>
            </div>
          </aside>
        </section>

        {cards.length > 0 && (
          <section aria-label="Recent card quote moves" className="overflow-hidden rounded-2xl border border-border/70 bg-card/70 px-3 py-3 sm:px-4">
            <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-primary" /> Latest quote moves
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {movers.map((card) => {
                const isUp = card.price_change_percent >= 0;
                return (
                  <button key={card.id} type="button" onClick={() => setSelectedCardId(card.id)} className="flex min-w-[190px] items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', isUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                      {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{card.title}</span>
                      <span className="mt-0.5 block text-[10px] tabular-nums text-muted-foreground">{formatLeCredits(card.current_price)}</span>
                    </span>
                    <span className={cn('text-[10px] font-bold tabular-nums', isUp ? 'text-success' : 'text-destructive')}>{isUp ? '+' : ''}{card.price_change_percent.toFixed(2)}%</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section id="card-grid" className="scroll-mt-4 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Discover the set</p>
              <h2 className="mt-1 font-display text-2xl font-black tracking-tight sm:text-3xl">Every card, one market</h2>
              <p className="mt-1 text-sm text-muted-foreground">Live server quotes · 30 fictional collectibles</p>
            </div>
            <div className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-bold tabular-nums text-muted-foreground">
              {catalogQuery.isLoading ? 'Loading…' : `${filteredCards.length} of ${cards.length} cards`}
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-border/70 bg-card/80 p-3 shadow-[var(--shadow-card)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border/70 bg-background/80 px-3.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cards, codes, or series…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Search cards" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X className="h-4 w-4 text-muted-foreground" /></button>}
              </label>
              <label className="flex h-11 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-sm">
                <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-semibold text-muted-foreground">Sort</span>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="min-w-0 bg-transparent text-xs font-bold outline-none">
                  <option value="featured">Featured</option>
                  <option value="move">Biggest move</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter cards by category">
              {categories.map((category) => (
                <button key={category.value} type="button" onClick={() => setActiveCategory(category.value)} aria-pressed={activeCategory === category.value} className={cn('shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition-all duration-200', activeCategory === category.value ? 'border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--primary)/.8)]' : 'border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground')}>
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {catalogQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="space-y-3 rounded-[1.35rem] border border-border/70 bg-card p-3">
                  <Skeleton className="aspect-[1.58] rounded-[1.15rem]" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : catalogQuery.isError ? (
            <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/[0.04] p-7 text-center">
              <CircleAlert className="mx-auto h-8 w-8 text-destructive" />
              <h3 className="mt-3 font-display text-lg font-extrabold">The card market could not load</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">Check your connection. If this is a new install, the card-market database migration must be applied before cards can be traded.</p>
              <Button type="button" variant="outline" className="mt-4 rounded-xl" onClick={() => void catalogQuery.refetch()}>Try again</Button>
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/50 px-5 py-12 text-center">
              <Layers3 className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-3 font-display text-lg font-extrabold">The market is being prepared</h3>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">The card catalogue is empty. Apply the card-market migration and seed data to open trading.</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-card/50 px-5 py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-3 font-display text-lg font-extrabold">No cards match that search</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a different name, code, or category.</p>
              <Button type="button" variant="ghost" className="mt-2" onClick={() => { setSearch(''); setActiveCategory('all'); }}>Clear filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filteredCards.map((card) => (
                <MarketCardTile
                  key={card.id}
                  card={card}
                  ownedCount={ownedCounts.get(card.id) ?? 0}
                  hasPurchasedBefore={previouslyPurchased.has(card.id)}
                  onDetails={() => setSelectedCardId(card.id)}
                  onBuy={() => openBuy(card)}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 text-xs leading-relaxed text-muted-foreground">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>All cards are fictional digital collectibles. Quotes can rise or fall and do not guarantee profit. “Le credits” are promotional simulation credits with no cash value and cannot be deposited, withdrawn, transferred, or redeemed. No real payment-card details are requested or stored.</p>
        </footer>
      </main>

      <Drawer open={Boolean(selectedCard)} onOpenChange={(open) => { if (!open) setSelectedCardId(null); }}>
        <DrawerContent className="max-h-[94dvh] rounded-t-[1.75rem] border-t-border/70">
          {selectedCard && (
            <div className="mx-auto w-full max-w-3xl px-4 pb-7 sm:px-7">
              <DrawerHeader className="px-0 pb-4 text-left">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">{categoryLabel[selectedCard.category]}</Badge>
                  {selectedCard.is_limited && <Badge variant="secondary"><Sparkles className="mr-1 h-3 w-3" /> Limited edition</Badge>}
                </div>
                <DrawerTitle className="font-display text-2xl font-black">{selectedCard.title}</DrawerTitle>
                <DrawerDescription>{selectedCard.code} · Fictional collectible card</DrawerDescription>
              </DrawerHeader>

              <div className="grid gap-5 md:grid-cols-[minmax(15rem,0.86fr)_minmax(0,1.14fr)]">
                <div className="space-y-3">
                  <CardArtwork card={selectedCard} />
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">About this card</p>
                    <p className="mt-2 text-sm leading-relaxed">{selectedCard.description}</p>
                  </div>
                  {selectedCard.is_limited && selectedCard.buyer_limit !== null && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-bold">First-collector edition</span>
                        <span className="tabular-nums text-muted-foreground">{Math.max(0, selectedCard.buyer_limit - selectedCard.lifetime_buyer_count)} / {selectedCard.buyer_limit} spots left</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Limited to one purchase per account. Selling does not restore a spot.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Latest server quote</p>
                        <p className="mt-1 font-display text-3xl font-black tabular-nums tracking-tight">{formatLeCredits(selectedCard.current_price)}</p>
                      </div>
                      <span className={cn('mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold tabular-nums', selectedCard.price_change_percent >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                        {selectedCard.price_change_percent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {selectedCard.price_change_percent >= 0 ? '+' : ''}{selectedCard.price_change_percent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                      <span className="text-muted-foreground">Your copies</span><span className="font-bold tabular-nums">{selectedOwnedCount}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Quote floor · ceiling</span><span className="font-semibold tabular-nums">{formatLeCredits(selectedCard.price_floor)} · {formatLeCredits(selectedCard.price_ceiling)}</span>
                    </div>
                    <Button type="button" className="mt-4 w-full rounded-xl" disabled={!canBuySelected} onClick={() => openBuy(selectedCard)}>
                      {selectedCard.status === 'sold_out' ? 'Sold out' : selectedCard.market_paused ? 'Trading paused' : selectedCard.is_limited && selectedPreviouslyPurchased ? 'One purchase per account' : 'Buy at live quote'}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="inline-flex items-center gap-2 text-sm font-extrabold"><BarChart3 className="h-4 w-4 text-primary" /> Quote history</h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Activity className="h-3 w-3 text-success" /> Refreshes with the market</span>
                    </div>
                    {historyQuery.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : historyQuery.isError ? (
                      <div className="flex min-h-36 items-center justify-center rounded-2xl border border-border bg-muted/20 px-5 text-center text-sm text-muted-foreground">Stored quote history is temporarily unavailable.</div>
                    ) : <CardPriceChart history={history} />}
                  </div>

                  <div className="rounded-xl bg-warning/10 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p><strong className="text-foreground">Price risk:</strong> this quote can fall after purchase. The chart shows saved backend quote points; it does not predict future prices. All values are simulated and non-redeemable.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <TradeConfirmDialog
        open={Boolean(buyTarget)}
        onOpenChange={(open) => { if (!open) cancelBuy(); }}
        mode="buy"
        cardTitle={currentBuyTarget?.title ?? ''}
        cardCode={currentBuyTarget?.code ?? ''}
        quote={currentBuyTarget?.current_price ?? 0}
        balance={walletBalance}
        isPending={isBuying}
        onConfirm={() => void confirmBuy()}
      />
      <BottomNav />
    </>
  );
};
