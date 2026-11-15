# Card Market Frontend Plan

## Product behavior and serving

Convert the company-investment interface into a fictional collectible-card exchange backed by the existing forward-only Supabase card migration. Authenticated users landing at `/` or completing sign-in go directly to `/market`. The public intro explains the card market and the one-time Le 15 promotional simulation credit; the retired `/onboarding` route redirects to Market instead of collecting investment preferences. Browse the 30 seeded meme, fictional-company, fintech-collectible, and community cards; open card details and stored quote history; confirm buys and sells through secure RPCs; and manage owned/sold cards from `/cards` and the account page.

The user experience must describe quotes as volatile, show downside and actual simulated-credit P/L, use the server as the sole source for balances and prices, and never promise profit. Simulated Le credits are non-redeemable and have no cash value. Do not collect, store, or present real Visa/payment-card numbers, CVVs, deposits, withdrawals, checkout, or cash payouts. The one-time Le 15 reward is granted through the idempotent backend claim. Market ticks and purchase/sale pressure are controlled by the database/Edge Function, not fabricated in the browser; an administrator may control prices and pauses later through the backend controls.

## Design direction

Reuse the existing product's premium fintech-glass visual system and reframe it as a collectible exchange rather than introducing an unrelated brand. The movement is **premium fintech glass with a collectible-edition edge**: OLED-leaning dark surfaces, a clean light theme, blue/cyan primary color, layered translucent panels, restrained gradients, and clear tabular market numbers.

- **Core principles:** clear card ownership and quotes; fast scanning; user confirmation before every trade; honest simulation and visible downside.
- **Color philosophy:** blue signals the trusted market/action layer, cyan accents the collectible and live-quote details, and green/red are reserved for actual positive/negative stored movement. The existing light/dark theme remains intact.
- **Layout paradigm:** an editorial, full-width Market workspace: concise market heading, simulated-credit strip and limited drop, followed by recent quote movers and a search/filter/sort toolbar that leads into an adaptive card collection. Details use a mobile bottom drawer and wider-screen split view. On phones, the existing fixed Home/Market/Cards/Profile navigation remains the primary shell.
- **Signature elements:** stable category-based foil gradients on fictional card faces; restrained collector-code/type labels; live change chips and a compact SVG chart built only from stored price history.
- **Interaction philosophy:** low-friction discovery, but no silent trading. A user reviews the current quote and simulation-credit effect, then the server commits the action. A retry of the same action retains its UUID idempotency key. Errors, empty states, stale data, and paused/sold-out states remain explicit.
- **Animation:** short opacity/transform transitions only where they clarify a state change; no price-flashing effects. Preserve reduced-motion behavior globally. Loading placeholders must not shift the collection layout.
- **Typography system:** Sora for display headlines and numeric emphasis, Inter for readable body/UI text, and tabular numerals for prices and balances.
- **Brand essence:** a playful, transparent card-collecting market for people who want to follow fictional quote movement without handling real payment cards; **curious, crisp, honest**.
- **Brand voice:** concise and energetic, but direct about non-cash value and loss risk. Example lines: “Collect the moment. Trade the quote.” and “Simulated Le credits only — no cash value.”
- **Wordmark and logo:** retain the existing `CP` monogram; frame its letters with a simple nested-card silhouette and subtle foil ring rather than a financial institution mark.
- **Signature brand color:** the existing Cash Pickup royal-blue-to-cyan blend, kept consistent across focus states, trade actions, and category treatments.

## Project structure

- `src/App.tsx`: shared providers, lazy route chunks, protected Market/Cards/Profile routes, and safe redirects for retired screens.
- `src/pages/Index.tsx` and `src/pages/GetStarted.tsx`: Market-first app entry and card-specific intro.
- `src/pages/Market.tsx` and `src/components/tabs/MarketTab.tsx`: responsive discovery, search/filter/sort, details, quote history, and buy flow.
- `src/hooks/useCardMarket.ts`: typed React Query reads, signed-in user scoping, realtime subscriptions, idempotent trade RPCs, and cache invalidation.
- `src/components/cards/`: stable fictional card artwork, card tiles, quote chart, and accessible trade review.
- `src/pages/Cards.tsx`: owned/sold inventory, serials, current and realized simulated P/L, and sale flow.
- `src/pages/WalletProfile.tsx`: account identity, simulated-credit balance/ledger, prominent Cards action, and sign-out.
- `src/components/BottomNav.tsx`: persistent Home, Market, Cards, and Profile navigation.
- `src/contexts/AuthContext.tsx`: non-blocking claim of the idempotent welcome bonus after authentication.
- `src/integrations/supabase/types.ts` and `card-trading-types.ts`: database-row/RPC constraints and frontend domain contracts; `supabase/migrations/20261114162900_card_trading_backend.sql` remains their database source.

## Data flow

Read `card_catalog` and `card_price_history`; restrict `card_wallets`, `card_holdings`, and `card_wallet_ledger` reads to the authenticated user. Execute trades only through `buy_card(p_card_id, p_request_id)` and `sell_card(p_holding_id, p_request_id)` with a UUID reused only for a retry of the same confirmed action. Never write balances, holdings, trades, quotes, history, or ledger rows directly from the browser. Refresh cached values only after authoritative RPC success, use Supabase Realtime for allowed catalogue and user-owned row changes, and keep a polling fallback for quotes. The scheduled Edge Function/database market tick supplies variable quote movement; admin controls remain backend-only until an admin interface is requested.
