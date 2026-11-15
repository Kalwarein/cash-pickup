# Prompt for the frontend implementation AI

You are editing the existing Cash Pickup repository. Implement the **frontend conversion only** from the old investment app to the virtual collectible-card trading app. The backend migration and RPC contract are in `docs/card-trading-api.md` and `supabase/migrations/20261114162900_card_trading_backend.sql`; read them before coding. Preserve the existing React, TypeScript, Vite, Tailwind, shadcn/ui, and Supabase stack, auth/session flows, and current project visual conventions. Do not replace the repo with a new scaffold.

## Product rules

- This is a simulated market for fictional collectible cards using non-redeemable promotional “Le credits.” It is not real-money trading and is not guaranteed income.
- Never create, display, request, or store actual Visa/payment-card details, PANs, CVVs, bank-account numbers, or payment credentials. Fictional card serials returned by the backend start with `CP-` and are inventory identifiers only. Avoid payment-network logos and claims of affiliation.
- Do not add deposits, withdrawals, cash purchases, real-money checkout, or Monime UI. The existing payment Edge Function routes intentionally return a disabled response.
- Do not use or mutate legacy `wallets`, `investments`, `transactions`, `payment_transactions`, or `companies` as the card-trading backend. Do not write directly to `card_catalog`, `card_wallets`, `card_holdings`, `card_trades`, `card_wallet_ledger`, or `card_price_history`.
- Prices can rise or fall. Use the persisted quote and history from Supabase; do not substitute client-only random prices or promise a return.

## Pages and flows

1. **Market**: replace investment listings with all 30 `card_catalog` rows. Support browsing/filtering the `meme`, `company`, `fintech_collectible`, and `community` categories; show current quote, signed change, category, limited-edition status, and market-paused/sold-out state. Include safe loading, empty, and error states.
2. **Card details**: show a card’s description, live quote, price change, limited-edition remaining buyer count where applicable, recent `card_price_history`, and a clear warning that the quote may fall. A limited edition permits one buy per user and closes permanently after 20 lifetime distinct buyers; selling a limited card does not reopen issuance.
3. **Buy**: on confirmation call `supabase.rpc('buy_card', { p_card_id: card.id, p_request_id: crypto.randomUUID() })`. Use the returned server execution price, serial, next quote, and balance. Disable while submitting; show RPC errors and never optimistic-credit the wallet. If retrying a network failure for the same action, reuse the same request UUID; a new user-confirmed purchase gets a new UUID.
4. **Sell**: sell only an owned holding by calling `supabase.rpc('sell_card', { p_holding_id: holding.id, p_request_id: crypto.randomUUID() })`. Display the server-returned current sale quote and simulated P/L. Proceeds return only to the simulated card-credit wallet.
5. **Cards account/profile section**: add a prominent “Cards” entry/button to the existing profile/account page. List the current user’s holdings, fictional `CP-` serial, original buy price, current quote, unrealized simulated P/L, and sale history/status. Offer Sell only for unsold holdings.
6. **Wallet view**: display `card_wallets.balance` as “Simulated Le credits” and show `card_wallet_ledger` history. Make clear that credits are promotional, nonwithdrawable, and have no cash value. Do not blend this amount with the legacy `wallets.balance`.
7. **Welcome bonus**: after the first authenticated session is established at sign-in, call `claim_card_welcome_bonus()` once and then refresh the wallet. It returns the one-time Le 15 credit grant for new and existing accounts. New accounts are also granted credits by the database auth trigger; the RPC safely claims the grant for existing accounts and is idempotent. Never grant credits in frontend code or create a new grant on later sign-ins.
8. **Real-time quotes**: subscribe to `postgres_changes` updates for `public.card_catalog` and refresh/reconcile the visible card and details quote. Load chart points from `card_price_history`, ordered newest/oldest as needed. Subscribe only to the currently viewed data and clean up channels on unmount.
9. **Optional admin screen**: show it only when a trusted session has `user.app_metadata.role` equal to `admin` or `card_admin`. This is a convenience gate only; the database RPC remains authoritative. Use `admin_adjust_card_price` and `admin_update_card_controls` for changes, require a reason, and never allow client direct table writes or editing auth metadata. No admin account should be provisioned by frontend code.

## Types and code quality

- Regenerate/update `src/integrations/supabase/types.ts` for the new tables/RPCs from the migration schema. Do not weaken Supabase client types with `any` or broad casts merely to make old investment components compile.
- Add focused hooks/components for card catalogue, card history, owned holdings, wallet/ledger and trade RPCs. Reuse existing auth and UI primitives where appropriate. Keep each Supabase query scoped to the signed-in user for private rows; RLS is still mandatory.
- Remove or retire investment-specific navigation, investment modals, claim actions, company charts, tap-to-earn cash displays, and wording that implies real deposits/withdrawals or actual profit. Keep auth/profile functionality unless it conflicts with the new flows.
- Use accessible labels, disabled/loading states, confirmation before buy/sell, and clear error feedback. Ensure mobile layouts remain usable.
- Preserve the existing branding/style rather than redesigning unrelated splash or auth surfaces.

## Backend operations that must remain as-is

The frontend repository is not a place to fake SQL behavior. Do not edit away the atomic/idempotent database functions, row-locking, limited-edition enforcement, one-time bonus, read policies, or admin audit. Do not enable payment routes. If the generated types need an update, derive it from the migration and keep the schema behavior intact.

At the end, run the repository’s build, lint, and tests, fix issues introduced by the UI conversion, and summarize changed routes/components/hooks plus any Supabase migration/deployment step still required. The SQL migration must be applied and the trusted one-minute `card-market-engine` schedule deployed/configured separately before automatic price ticks appear.
