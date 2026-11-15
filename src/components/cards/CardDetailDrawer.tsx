import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Loader2, LockKeyhole } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { formatSLE } from '@/lib/currency';
import { cardProfit, editionRemaining, quoteChange } from '@/lib/cardTrading';
import { useCardHistory, type Collectible } from '@/hooks/useCardMarket';
import type { Tables } from '@/integrations/supabase/types';
import { CardArtwork } from './CardArtwork';

type Holding = Tables<'card_holdings'>;

export function CardDetailDrawer({ card, onClose, balance, holdings }: { card: Collectible | undefined; onClose: () => void; balance: number; holdings: Holding[] }) {
  const history = useCardHistory(card?.id);
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const owned = holdings.filter(h => h.card_id === card?.id);
  async function trade(action: 'buy' | 'sell', holding?: Holding) {
    if (!card || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('trade_card', { p_card_id: card.id, p_action: action, p_request_key: crypto.randomUUID(), p_expected_price: card.current_price, ...(holding ? { p_holding_id: holding.id } : {}) });
      if (error) throw error;
      await Promise.all(['card-catalogue', 'card-holdings', 'card-account', 'card-history'].map(key => cache.invalidateQueries({ queryKey: [key] })));
      onClose();
      notify.success(action === 'buy' ? 'Card added to your collection' : 'Card sold', 'Proceeds and purchases use nonwithdrawable promotional credit.');
    } catch (error) {
      notify.error('Trade not completed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  }
  const change = card ? quoteChange(card.current_price, card.initial_price) : 0;
  const points = history.data?.map(p => ({ time: new Date(p.recorded_at).getTime(), price: Number(p.price) })) ?? [];
  return <Drawer open={!!card} onOpenChange={open => { if (!open) onClose(); }} repositionInputs={false}>
    <DrawerContent className="sm:mx-auto sm:max-w-xl">
      {card && <div className="space-y-6 p-5 pb-8">
        <div className="flex items-center gap-4">
          <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg"><CardArtwork artworkKey={card.artwork_key} name={card.name} /></div>
          <div><p className="mb-2 text-xs uppercase text-muted-foreground">{card.category} / {card.ticker}</p><DrawerTitle className="font-display leading-tight tracking-normal">{card.name}</DrawerTitle><DrawerDescription className="mt-2">{card.description}</DrawerDescription></div>
        </div>
        <div><p className="text-xs text-muted-foreground">Current quote</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{formatSLE(card.current_price)}</p><p className={`mt-2 text-sm ${change >= 0 ? 'text-profit' : 'text-loss'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% since launch</p></div>
        <section aria-label="Recorded card price history">
          <h3 className="mb-3 text-sm font-medium">Price history <span className="float-right text-xs text-muted-foreground">SLE · since launch</span></h3>
          <div className="h-48">
            {history.isPending ? <div className="flex h-full items-center justify-center"><Loader2 aria-label="Loading price history" className="animate-spin text-primary" /></div> : history.isError ? <div className="flex h-full flex-col items-center justify-center gap-2"><p>Price history unavailable</p><Button variant="outline" onClick={() => history.refetch()}>Retry</Button></div> : points.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}><CartesianGrid stroke="hsl(var(--border))" vertical={false} /><XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} minTickGap={48} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><YAxis width={48} domain={['auto', 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} /><Tooltip labelFormatter={t => new Date(Number(t)).toLocaleString()} formatter={v => [formatSLE(Number(v)), 'Quote']} contentStyle={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} /><Area type="linear" dataKey="price" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.12)" strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">First quote recorded. History begins at launch.</div>}
          </div>
        </section>
        <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm"><div><dt className="text-muted-foreground">Issued</dt><dd className="mt-1 font-medium">{card.issued_count} cards</dd></div><div><dt className="text-muted-foreground">Edition</dt><dd className="mt-1 font-medium">{card.buyer_limit ? `${editionRemaining(card.buyer_limit, card.issued_count)} of 20 available` : 'Open collection'}</dd></div></dl>
        <p className="text-sm leading-relaxed text-muted-foreground">Collectible only. Prices are generated and may rise or fall. No guaranteed return. Promotional credit cannot be withdrawn.</p>
        <div className="flex items-center justify-between text-sm"><span>Promotional balance</span><span className="font-mono">{formatSLE(balance)}</span></div>
        <Button className="w-full" disabled={busy || card.purchase_closed || balance < card.current_price || (!!card.buyer_limit && owned.length > 0)} onClick={() => trade('buy')}>{busy ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}{card.purchase_closed ? 'Edition closed' : balance < card.current_price ? 'Insufficient promotional credit' : 'Buy card with credit'}</Button>
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="h-3 w-3" />Cash trading awaits launch approval</p>
        {owned.length > 0 && <section><h3 className="mb-3 font-medium">Your cards</h3>{owned.map(h => <div key={h.id} className="flex items-center justify-between gap-3 border-t border-border py-3"><div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{h.serial.slice(0, 15)}</p><p className="mt-1 text-sm">Purchased {formatSLE(h.purchase_price)}</p><p className="text-xs">Unrealized {formatSLE(cardProfit(h.purchase_price, card.current_price), true)}</p></div><Button variant="outline" disabled={busy} onClick={() => trade('sell', h)}><ArrowDownLeft />Sell</Button></div>)}</section>}
        <DrawerClose asChild><Button variant="secondary" className="w-full">OK</Button></DrawerClose>
      </div>}
    </DrawerContent>
  </Drawer>;
}