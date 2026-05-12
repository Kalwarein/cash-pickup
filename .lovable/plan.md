# Cash Pickup — Trading-Grade Market, Splash-Only Loading, Popup Notifications

Three workstreams, executed in order so the chart depends on the new engine output.

---

## 1. Splash-only loading + animated notification popup

**Loading**

- Splash (`Index.tsx`) already gates on fonts + window load. Extend it to also prefetch: session, wallet, companies list, active investments. Splash stays until all resolve (with 4s failsafe).
- Remove every `<PremiumSpinner />` usage across pages/tabs/modals. **Keep** `CardSkeletons` shimmer placeholders.
- Delete `PremiumSpinner.tsx` once unused.

**Notification popup system**

- New `<NotificationPopup />` component: centered modal, scale-in + fade-in (Tailwind animations), backdrop blur, single big "OK" button, auto-dismiss optional.
- New `NotificationContext` exposing `notify({ title, body, tone })`. Queue support so multiple notifications stack and play one after another.
- Replace `toast.*` calls used for *user-facing celebrations* (claim success, deposit success, errors that need acknowledgement) with `notify()`. Keep sonner for tiny status confirmations.
- Wire `usePushNotifications` so when the tab is visible, the friendly 30-min message renders as in-app popup instead of a system notification.

---

## 2. Engine refactor → 1-minute OHLC as single source of truth

**Database (migration)**

- New table `company_candles_1m`:
  - `company_id uuid`, `bucket_start timestamptz` (truncated to minute), `open/high/low/close numeric`, `volume numeric`, primary key `(company_id, bucket_start)`.
  - Index `(company_id, bucket_start desc)`.
  - RLS: public SELECT.
- Retention helper `cleanup_old_candles_1m()`: keep last 14 days per company (~20k rows/co).
- New SQL function `get_candles(company_id, timeframe, limit)` that aggregates 1m → requested TF (`1m,5m,15m,30m,1H,4H,1D,1W,1M`) using `date_bin` and returns OHLCV rows. Marked `STABLE SECURITY DEFINER` with `set search_path=public`.
- Reschedule `pg_cron` job for `market-engine` from hourly to **every minute** (insert tool, not migration).
- Drop the legacy `company_candles` insert path from the engine (table can stay for now to avoid breakage; will fall out of use).

**Edge function** `market-engine`

- Loops every minute. Same weekly_target_cap walk model, but step is `gap / minutes_left + small noise`.
- Writes one `company_candles_1m` row using `upsert` on `(company_id, bucket_start)` so re-invocations are idempotent.
- Updates `companies.current_price`, `market_cap`, `price_change_percent` (24h vs ~1440 mins ago).
- Periodic call to `cleanup_old_candles_1m()` (1% chance per tick).

**Realtime**

- Enable Supabase Realtime on `company_candles_1m` so chart receives the new minute candle as soon as the engine writes it.

---

## 3. TradingView-grade chart UI

**Library:** `lightweight-charts` (TradingView, MIT, ~45kb).

**New component** `TradingChart.tsx`

- Fullwidth, responsive, dark/light aware (reads from theme).
- Top toolbar: company name + ticker + live price + 24h delta chip.
- Chart-type switcher: Candlestick (default), Heikin Ashi (computed client-side from OHLC), Bars, Line, Area.
- Timeframe tabs: `1m · 5m · 15m · 30m · 1H · 4H · 1D · 1W · 1M`.
- Crosshair with floating OHLC tooltip in the corner.
- Volume histogram pane below price.
- Price scale on right, time scale on bottom, zoom/pan enabled.
- Empty/loading state uses `CardSkeletons` (shimmer rectangle), no spinner.

**Data layer** `useTradingCandles(companyId, timeframe)`

- Calls Supabase RPC `get_candles(company_id, timeframe, 500)` for historical load.
- Subscribes to `company_candles_1m` realtime for that company. On each new 1m row, locally update the *current* bucket of the active timeframe (re-aggregate the in-progress candle: high = max, low = min, close = new close, volume += new volume). When the bucket boundary is crossed, append a new candle.
- Heikin Ashi computed in a memoized derivation on top of OHLC.

**Pages updated**

- `CompanyDetail.tsx`: replace existing chart block with `<TradingChart />`.
- `MarketTab.tsx` index/sparkline area: keep current minimal sparkline (it's an index summary, not a per-asset chart) but feed it from the new data source.

---

## Files

**New**

- `src/components/TradingChart.tsx`
- `src/components/NotificationPopup.tsx`
- `src/contexts/NotificationContext.tsx`
- `src/hooks/useTradingCandles.ts`
- `supabase/migrations/<ts>_candles_1m.sql`

**Modified**

- `supabase/functions/market-engine/index.ts` — 1m engine, idempotent upsert
- `src/pages/Index.tsx` — prefetch app-critical data before fade
- `src/App.tsx` — mount `NotificationProvider`
- `src/components/CompanyDetail.tsx` — embed `<TradingChart />`
- `src/components/ClaimInvestmentCard.tsx` — popup on claim
- `src/components/DepositWithdrawModal.tsx` — popup on success/error
- `src/hooks/usePushNotifications.ts` — route foreground messages to popup
- `src/components/tabs/{HomeTab,MarketTab,InvestTab,WalletTab}.tsx`, `src/pages/Earn.tsx` — strip `<PremiumSpinner />`, keep skeletons
- `src/integrations/supabase/types.ts` — auto-regenerated

**Deleted**

- `src/components/PremiumSpinner.tsx` (after all references removed)

**Deps**

- `bun add lightweight-charts`

---

## Technical notes

- Aggregation in `get_candles` uses `date_bin('5 minutes', bucket_start, 'epoch')` etc.; `1M` uses `date_trunc('month', ...)`. Open = first by bucket_start, Close = last, High = max, Low = min, Volume = sum.
- Realtime aggregation keeps the chart smooth between engine ticks: the open bucket updates in place; on minute rollover a new candle is appended without a refetch.
- `lightweight-charts` is canvas-based — handles 500+ candles at 60fps on mobile.
- All SLE labels preserved; no "demo/simulation" wording.