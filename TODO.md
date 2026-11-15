# Card Market Frontend Outcomes

## Market discovery and card details

- [x] Replace the investment/company listings on the Market page with all 30 rows from `card_catalog`; support browse/filter by `meme`, `company`, `fintech_collectible`, and `community`; show each card's current simulated quote, signed change, category, limited-edition state, and paused/sold-out state; provide useful loading, empty, and error states. Include at least three fictional fintech-styled collectibles without actual Visa branding or payment credentials.
- [x] Add card details with description, current quote, live price change, available limited-edition count based on the 20-distinct-buyer cap, recent `card_price_history`, and a clear notice that the quote can decrease. When a limited card reaches its first 20 buyers, close purchase issuance; selling must not restore a spot.
- [x] Add search and sort controls, a responsive card grid, a featured card, and a concise market overview that remains readable on phones and wider screens. Use backend quotes, not locally randomized display prices; render a quote-history chart only from stored backend observations.

## Authenticated trading and simulated balance

- [x] Show the available balance as “Simulated Le credits,” clearly non-redeemable and having no cash value; never display it as a deposit/withdraw balance.
- [x] Buy only after a user confirmation by calling `buy_card(p_card_id, p_request_id)` with a UUID. Show the authoritative execution price, generated `CP-` inventory serial, resulting quote, and balance only after server success. Reuse the request ID only for retrying the same action; create a new ID for a new user-confirmed purchase.
- [x] Sell only an owned unsold holding after confirmation through `sell_card(p_holding_id, p_request_id)`. Show server-returned execution quote and simulated profit/loss. Sale proceeds go only to the card-credit wallet.
- [x] Never write wallet balances, holdings, trades, card prices, history, or ledger rows directly from the frontend. Handle RPC errors and stale/not-available cards without optimistic balance changes.

## Cards collection and account/profile

- [x] Add a prominent “Cards” button in the account/profile page and a `/cards` collection page. Show each current user's owned and sold cards, fictional `CP-` serial, buy price, current quote, unrealized or realized simulated P/L, and sale status; offer Sell only for unsold holdings.
- [x] Replace legacy cash/deposit/withdraw/investment performance widgets in the account screen with simulated card-wallet balance, card count/value context, ledger activity, profile details, and sign-out. Do not combine the old `wallets.balance` with `card_wallets.balance`.
- [x] Display the card wallet ledger with welcome bonus, buy, and sell events.

## Bonus, realtime, and retired flows

- [x] Once an authenticated user session is established, call idempotent `claim_card_welcome_bonus()` and refresh card-wallet data. New-account trigger grants are safe to claim again; existing users receive the one-time Le 15 grant; sign-in and subsequent sign-ins must not mint credits in frontend code.
- [x] Subscribe to `public.card_catalog` updates for live quotes and to only the signed-in user's wallet/holding changes; refresh details/history as needed and clean up subscriptions when components unmount.
- [x] Remove/redirect investment, mining/tap-to-earn, cash deposit/withdraw, payment, and payout entry points that no longer match the card-only backend. Preserve authentication and profile; route `/` and successful sign-in directly to the card Market, replace the old investment onboarding with a card-trading intro, and redirect legacy `/onboarding` traffic safely.
- [x] Never create, collect, display, or store actual Visa/payment-card numbers, CVVs, bank data, real-money checkout, or claims of guaranteed profit. These are fictional collectibles using promotional simulated credits only.
