# Backend rules
- Card trading must execute through transactional database functions with row locks and idempotency keys, because client balance writes and concurrent trades are unsafe.
- Persist all card quotes and immutable history in the database, because all viewers must receive the same prices.
- Keep card promotional credit separate from withdrawable wallet cash and preserve that split on resale, because signup rewards must not create unfunded cash payouts.
- Cash card trading remains disabled until legal approval, payout funding and payment reconciliation are verified, because synthetic quotes are not independently funded market liquidity.
- Keep legacy investment tables for compatibility but deny client money mutations and retire earning endpoints, because the old frontend must not mint balances during the card migration.
- Use card-specific query hooks and the shared drawer for Market; invalidate persisted catalogue/history on live updates so no client invents quotes.
- Until cash settlement is approved, card orders use only a separate promotional ledger and cannot debit or credit wallet cash.