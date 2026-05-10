## Cash Pickup — Market Realism + UI Polish Overhaul

This is a large change set. Plan groups work into 4 phases so it ships cleanly.

---

### Phase 1 — Data model: real companies + market-cap economy

**Migration (schema additions on `companies`):**
- `market_cap` numeric (current net worth in SLE — values like 800,000,000,000)
- `weekly_target_cap` numeric (next weekly anchor — current price walks toward this hour-by-hour)
- `weekly_target_set_at` timestamptz
- `country` text (`SL` | `INT`)
- `logo_url` text (optional)
- Reuse existing `min_return_percent` / `max_return_percent` as the **stated** weekly best/worst projections shown to users.

**Seed data (insert tool):** wipe `companies`, then insert ~25 companies — 60% international (Apple, Google, Meta, Microsoft, Amazon, Tesla, Nvidia, Netflix, Coca-Cola, Samsung, Toyota, Visa, Mastercala, Nike, Disney) and 40% Sierra Leone (Africell SL, Orange SL, Rokel Commercial Bank, Sierra Rutile, Sierratel, Sierra Leone Brewery, Leocem, NP-SL, Splash Mobile Money, Aureol Tobacco). Each gets:
- realistic `market_cap` (SL: 80M–2B SLE, INT: 50B–3T SLE)
- `min_return_percent` (worst weekly, e.g. -10.8 for small / down to -90 max)
- `max_return_percent` (best weekly, e.g. small co +8.9, big co +29.8)
- `risk_level` derived from cap (huge cap → Low; small cap → High)

---

### Phase 2 — Engine rewrite (hourly cadence + weekly anchor)

**`market-engine` edge function:**
- Switch cron from every minute → every hour.
- On Monday 00:00 (or when `weekly_target_set_at` is >7d old): pick a new `weekly_target_cap` between `current_cap × (1 + min_return_percent/100)` and `current_cap × (1 + max_return_percent/100)`, biased toward losses (~60% of weekly targets land below current).
- Each hourly tick: walk `current_price` / `market_cap` ~1/168th of the way toward `weekly_target_cap` plus small noise. Insert candle + price-history rows.
- At end of week: snap exactly to `weekly_target_cap`.

**`trade-monitor` / claim path:**
- Maturity CPR for each investment = a **random** value uniformly chosen between `min_return_percent` and `max_return_percent` of its company, but clipped so |loss| ≥ |profit| 60% of the time (loss-biased distribution).
- Always strictly ≤ stated `max_return_percent` (never exceeds the advertised ceiling).

**Claim flow (`ClaimInvestmentCard.tsx`):**
- After successful claim → toast.success / toast.error with the exact SLE amount (`+SLE 1,234.56 added` / `−SLE 432.10 deducted`). Already mostly wired; tighten copy and surface failures distinctly.

---

### Phase 3 — UI overhaul

**Loading states (global):**
- New `<PremiumSpinner />` component (gradient ring + pulsing dot) replacing ad-hoc spinners.
- New `<CompanyCardSkeleton />`, `<InvestmentCardSkeleton />`, `<ChartSkeleton />` using shimmer.
- Apply skeletons in `InvestTab`, `MarketTab`, `HomeTab`, `Earn`, `WalletTab` instead of blank/`null`.

**Market page:**
- Remove the "Hidden Gem" tab entirely (and any badge) so gems are indistinguishable from other companies.

**Invest page (`InvestTab` + `CompanyCard`):**
- Card now shows: logo/ticker, sector, **market cap (formatted: SLE 1.2T / 850B / 240M)**, risk badge, dual badges `Best: +X.X%` (green) and `Worst: −Y.Y%` (red), live price, 24h change.
- Premium amount picker in `InvestModal` with quick-chips (10%, 25%, 50%, MAX), live projection block: "If things go well: up to +SLE… · If things go poorly: down to −SLE…" with a disclaimer "Actual return is random and may be lower than the stated maximum."

**Company details (`CompanyDetail.tsx`):**
- Hero with risk-tier gradient header, market cap, country flag.
- Live price + chart (existing) + **Outcome Breakdown** card listing: stated best, stated worst, expected (mid), and the same disclaimer.
- "Invest now" CTA pinned bottom on mobile.

**Investment outcome messaging:**
- Replace any "you will earn X%" copy with "you **may** earn up to X% — actual result is random and could be lower or negative."

---

### Phase 4 — Cron + cleanup

- Update `cron.schedule` for `market-engine` to hourly via insert tool.
- Keep `cleanup_old_company_candles` (already trims to 500/company).
- No changes to auth, payments, or onboarding.

---

### Files touched (estimated)

- **New:** `src/components/PremiumSpinner.tsx`, `src/components/skeletons/{CompanyCardSkeleton,InvestmentCardSkeleton,ChartSkeleton}.tsx`
- **Edited:** `CompanyCard.tsx`, `InvestModal.tsx`, `CompanyDetail.tsx`, `tabs/InvestTab.tsx`, `tabs/MarketTab.tsx`, `tabs/HomeTab.tsx`, `tabs/WalletTab.tsx`, `Earn.tsx`, `ClaimInvestmentCard.tsx`, `useInvestments.ts`, `useCompanies.ts`
- **Edge:** `supabase/functions/market-engine/index.ts`, `supabase/functions/trade-monitor/index.ts`
- **Migration:** add columns to `companies`
- **Insert tool:** seed 25 companies, reschedule cron to hourly

---

### Confirm before I start

This is ~12 file edits + 1 migration + reseed + cron change. Approve and I'll execute end-to-end in one pass.
