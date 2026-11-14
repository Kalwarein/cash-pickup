# Cash Pickup card trading

Backend-first conversion. The current frontend is intentionally not redesigned in this request.

Collectibles are fictional and confer no shares, bank account, payment-network membership or payment capability. Payment-card-style collectibles are not Visa cards; identifiers use a CP- prefix and are not payment credentials.

## Money and launch

Quotes are synthetic and fluctuate on a disclosed random engine, plus buy/sell pressure. A price increase is not guaranteed cash income. Cash purchases are disabled by default. Launch requires Sierra Leone legal/regulatory review, written Monime acceptance of this use case, funded liquidity and reconciled, authenticated, atomic Monime settlement. Existing Monime code is not certified for this launch. No actual paid trade is verified in this delivery.

One SLE 15 promotional grant per account is claimed on first authenticated card-session access, not every login. It is nonwithdrawable. Promotional purchases and their resale proceeds remain promotional; mixed purchases preserve the cash/promotional proportions. New wallets also receive their grant automatically. Existing accounts claim it through the same authenticated function, without repeat grants.

## Price and ownership

Each purchase creates one owned collectible with a unique CP-prefixed serial. A buy executes at the persisted quote, then increases the next quote. A sell executes at the persisted quote, then decreases the next quote. A SLE 300 purchase sold at SLE 600 returns SLE 600, with SLE 300 profit, before the split between cash and promotional proceeds. There are no invented historical candles.

Limited editions stop new purchases permanently after 20 distinct lifetime buyers/20 issued units. Each person may buy a limited edition only once; selling does not reopen issuance. Existing owners can still sell, subject to cash liquidity. Other collections have no buyer cap.

All clients receive public price updates. Owners see only their own holdings, trades and bonus account. Only protected admins may change quote controls, and each action is audited. No admin account is provisioned automatically.