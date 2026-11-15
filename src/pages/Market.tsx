import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Layers3, Loader2, RefreshCw, Search, Wallet } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardArtwork } from '@/components/cards/CardArtwork';
import { CardDetailDrawer } from '@/components/cards/CardDetailDrawer';
import { useCardMarket } from '@/hooks/useCardMarket';
import { quoteChange } from '@/lib/cardTrading';
import { formatSLE } from '@/lib/currency';

const Market = () => {
  const { catalogue, account, holdings } = useCardMarket();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('price');
  const [selected, setSelected] = useState<string>();
  const [view, setView] = useState<'market' | 'owned'>('market');
  const ownedIds = useMemo(() => new Set(holdings.data?.map(h => h.card_id)), [holdings.data]);
  const filtered = useMemo(() => (catalogue.data ?? []).filter(c =>
    (category === 'All' || (category === 'Limited' ? c.buyer_limit !== null : c.category === category)) &&
    `${c.name} ${c.ticker}`.toLowerCase().includes(search.toLowerCase()) && (view === 'market' || ownedIds.has(c.id))
  ).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'movers' ? quoteChange(b.current_price, b.initial_price) - quoteChange(a.current_price, a.initial_price) : a.current_price - b.current_price), [catalogue.data, category, search, sort, view, ownedIds]);
  const activeCard = catalogue.data?.find(c => c.id === selected);
  return <div className="min-h-screen bg-background pb-28 font-display">
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <header className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Layers3 className="h-5 w-5 text-primary" />Cash Pickup</div><Button aria-label="Refresh market" title="Refresh market" size="icon" variant="ghost" onClick={() => catalogue.refetch()}><RefreshCw className={catalogue.isFetching ? 'animate-spin' : ''} /></Button></header>
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">Market</h1><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" />{catalogue.isError ? 'Unavailable' : catalogue.isPending ? 'Connecting' : 'Quotes · 1 min'}</span></div>
      <div className="mt-5 grid grid-cols-2 border-y border-border py-4"><div><p className="text-xs text-muted-foreground">Collectibles</p><p className="mt-1 text-2xl font-semibold tabular-nums">{catalogue.data?.length ?? '—'}</p></div><div className="border-l border-border pl-5"><p className="text-xs text-muted-foreground">Promotional credit</p><p className="mt-1 text-xl font-semibold tabular-nums">{account.data ? formatSLE(account.data.promo_balance) : '—'}</p></div></div>
      {account.isError && <div className="mt-3 flex items-center justify-between gap-2 text-sm text-loss"><span>Credit balance unavailable</span><Button variant="outline" onClick={() => account.refetch()}>Retry</Button></div>}
      <div className="mt-6 flex gap-2" role="group" aria-label="Collection view"><Button variant={view === 'market' ? 'default' : 'ghost'} onClick={() => setView('market')}><Layers3 />Discover</Button><Button variant={view === 'owned' ? 'default' : 'ghost'} onClick={() => setView('owned')}><Wallet />My cards {holdings.data ? `(${holdings.data.length})` : ''}</Button></div>
      <div className="relative mt-5"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input aria-label="Search cards" placeholder="Search cards or symbols" value={search} onChange={e => setSearch(e.target.value)} className="h-12 bg-card pl-10" /></div>
      <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Card categories">{['All', 'Meme', 'Company', 'Payment', 'Limited'].map(cat => <Button key={cat} variant={category === cat ? 'secondary' : 'ghost'} className="px-3" aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</Button>)}</div>
      <div className="mb-4 mt-6 flex items-center justify-between gap-3"><h2 className="font-semibold">{view === 'owned' ? 'Your collection' : 'Explore cards'} <span className="ml-1 text-sm font-normal text-muted-foreground">{filtered.length}</span></h2><select aria-label="Sort cards" value={sort} onChange={e => setSort(e.target.value)} className="min-h-11 rounded-lg border border-border bg-card px-2 text-xs"><option value="price">Price: low to high</option><option value="movers">Top movers</option><option value="name">Name: A–Z</option></select></div>
      {catalogue.isPending ? <div className="flex min-h-64 items-center justify-center"><Loader2 aria-label="Loading card market" className="h-7 w-7 animate-spin text-primary" /></div> : catalogue.isError ? <div className="py-16 text-center"><p>Card market is unavailable.</p><Button className="mt-4" onClick={() => catalogue.refetch()}>Try again</Button></div> : filtered.length === 0 ? <div className="py-16 text-center"><Layers3 className="mx-auto mb-4 h-8 w-8 text-muted-foreground" /><p>{view === 'owned' ? 'No cards in this collection yet' : 'No matching cards'}</p></div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filtered.map((card, index) => {
        const change = quoteChange(card.current_price, card.initial_price);
        const Direction = change >= 0 ? ArrowUpRight : ArrowDownRight;
        return <Button key={card.id} variant="ghost" onClick={() => setSelected(card.id)} aria-label={`View ${card.name}`} className="group block h-auto min-w-0 overflow-hidden whitespace-normal rounded-lg border border-border bg-card p-0 text-left shadow-card hover:border-primary/50 hover:bg-card">
          <div className="relative aspect-[4/5] overflow-hidden"><CardArtwork artworkKey={card.artwork_key} name={card.name} eager={index < 2} /><span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground backdrop-blur-sm">{card.buyer_limit ? `Limited · ${card.issued_count}/20` : card.category}</span>{card.purchase_closed && <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-xs">Edition closed</span>}</div>
          <div className="p-3"><p className="mb-1 text-xs font-normal text-muted-foreground">{card.ticker}</p><h3 className="min-h-10 text-sm font-semibold leading-5">{card.name}</h3><p className="mt-2 text-sm font-semibold tabular-nums">{formatSLE(card.current_price)}</p><p className={`mt-1 flex items-center gap-1 text-xs font-medium tabular-nums ${change >= 0 ? 'text-profit' : 'text-loss'}`}><Direction className="h-3 w-3" />{change >= 0 ? '+' : ''}{change.toFixed(2)}% <span className="font-normal text-muted-foreground">from launch</span></p></div>
        </Button>;
      })}</div>}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Original collectibles, not shares or payment cards. Quotes can rise or fall. Cash trading is not yet available.</p>
    </main>
    <CardDetailDrawer card={activeCard} onClose={() => setSelected(undefined)} balance={Number(account.data?.promo_balance ?? 0)} holdings={holdings.data ?? []} />
    <BottomNav />
  </div>;
};

export default Market;