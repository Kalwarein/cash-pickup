# Card-trading backend contract

This repository now contains a forward-only Supabase migration for **simulated collectible-card trading**. The new system uses fictional cards and non-redeemable promotional credits only. It is not a payment-card service, does not issue Visa or other network cards, is not connected to real-money settlement, and does not guarantee profits.

## Apply and deploy

The migration is `supabase/migrations/20261114162900_card_trading_backend.sql`. Review it against the intended Supabase project, then apply it through the project's normal migration process (for example, `supabase db push` from an authorized development environment). It was not applied to the live Supabase database in this coding session; this repository contains the change, not evidence of a deployed schema.

Deploy the new `card-market-engine` Edge Function after applying the migration. It requires a valid Supabase **service-role JWT** and additionally checks that the signed JWT has `role=service_role`. Configure a private scheduled caller to send a `POST` to `/functions/v1/card-market-engine` approximately once per minute. Keep the service-role key only in trusted scheduler secrets; never expose it to the browser, commit it, or add it to a Vite environment variable. The SQL tick is idempotent within each minute. Until the function is deployed and a trusted scheduler is configured, quotes still respond to buys/sells but do not receive automatic timed ticks.

New accounts receive one `15.00` credit grant through an auth trigger. For existing accounts, the frontend should call `claim_card_welcome_bonus()` immediately after the first authenticated sign-in/session is established. The claim is idempotent and is not reissued on later sign-ins.

## Data model

- `card_catalog`: 30 fictional meme, company, fintech-style collectible, and community cards; current/previous quotes, random-tick volatility, buy/sell pressure, price bounds, pause state, and optional lifetime-buyer limits. Several launch cards permanently stop minting after 20 distinct buyers.
- `card_wallets`: isolated balance of simulated Le credits. It is not the legacy wallet and cannot be deposited to or withdrawn from.
- `card_wallet_ledger`: append-only bonus/buy/sell credit history with per-user idempotency keys and resulting balance.
- `card_holdings`: one collectible instance per purchase, a generated `CP-` serial, original quote, current ownership state, and sale quote if sold. A serial is a fictional inventory identifier, never a PAN, CVV, bank-account number, or payment credential.
- `card_trades`: immutable buy/sell executions at persisted server quotes, including the resulting next quote and realized simulated profit/loss.
- `card_price_history`: quote history for charts, including random ticks, buy/sell pressure, and audited admin adjustments.
- `card_admin_audit`: before/after snapshots and reason for protected admin changes.

All trading credits and proceeds remain in the promotional-credit system. For example, buying at 300 and later selling at 600 would add 600 simulated credits to that card wallet and record 300 simulated profit, before any later trade. It is not cash income and cannot be withdrawn.

## RPC contract

The browser must not write prices, holdings, trades, wallet balances, or ledger rows directly. Use authenticated Supabase RPC calls:

- `claim_card_welcome_bonus()` → `{ granted, bonus_amount, balance, currency_label }`
- `buy_card(p_card_id uuid, p_request_id uuid)` → includes `trade_id`, `holding_id`, fictional `serial_code`, execution `unit_price`, `price_after`, and simulated-credit `balance`.
- `sell_card(p_holding_id uuid, p_request_id uuid)` → includes the sale `unit_price`, original `purchase_price`, `price_after`, simulated `profit_loss`, and `balance`.

Generate a fresh UUID for each user action and reuse that same UUID only when retrying that exact request. Database row locks serialize competing trades; limited editions count lifetime distinct buyers, allow at most one purchase per user, and never reopen when a card is sold. The system sells/mints collectibles from its simulated catalogue; it does not claim that a seller's holding is matched to a specific other user.

Price history and the public catalogue are readable for the live market. Wallets, holdings, trades and ledger are readable only by their owner. `card_catalog` and owner holdings are added to Supabase Realtime publication; subscribe to catalogue changes for live quotes.

## Admin controls

No admin is created automatically. The database accepts the protected Supabase `app_metadata.role` claim `admin` or `card_admin`; this metadata must be set by a trusted project operator, never by the client or editable user metadata. Protected RPCs are:

- `admin_adjust_card_price(p_card_id, p_new_price, p_reason)`
- `admin_update_card_controls(p_card_id, p_market_paused, p_volatility_pct, p_buy_impact_pct, p_sell_impact_pct, p_reason)`

Each change validates configured bounds and records an audit entry. Ordinary users have no direct update privilege over the catalogue.

## Legacy transition

The migration preserves the old investment, payment, and wallet rows for history but removes client insert/update/delete permissions from legacy balances, investments, transactions, payment tracking, and old market quote tables. Old investment price/maturity and tap-to-wallet endpoints return a retired response. The Monime deposit, withdrawal, and webhook routes return the configured payments-pending response and no longer initiate settlement or write balances. The active Market, Cards, Home, and account screens now use the card-market data and RPC contract above. Legacy page source may remain in the repository for history, but its routes are retired or redirected and must not be re-enabled without a separate review.

## Operational caveats

- This is a simulation, not real securities trading, stored value, e-money, a payment credential, or a promise of profit.
- The card prices are synthetic and can go down as well as up. They do not represent third-party market prices.
- No paid trade, cash purchase, real-user settlement, Monime reconciliation, or liquidity mechanism is implemented or verified.
- Do not enable real-money purchases/redemptions without separate legal, regulatory, provider, liquidity, security, and reconciliation review.
