BEGIN;

-- Cash Pickup card trading is a simulated, non-redeemable collectible market.
-- These records are not payment cards, bank accounts, securities, or real-money balances.

CREATE TABLE public.card_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('meme', 'company', 'fintech_collectible', 'community')),
  description TEXT NOT NULL DEFAULT '',
  current_price NUMERIC(14,2) NOT NULL CHECK (current_price > 0),
  previous_price NUMERIC(14,2) NOT NULL CHECK (previous_price > 0),
  price_change_percent NUMERIC(9,4) NOT NULL DEFAULT 0,
  price_floor NUMERIC(14,2) NOT NULL DEFAULT 1 CHECK (price_floor > 0),
  price_ceiling NUMERIC(14,2) NOT NULL DEFAULT 100000 CHECK (price_ceiling > 0),
  volatility_pct NUMERIC(6,3) NOT NULL DEFAULT 2.5 CHECK (volatility_pct BETWEEN 0 AND 25),
  buy_impact_pct NUMERIC(6,3) NOT NULL DEFAULT 0.75 CHECK (buy_impact_pct BETWEEN 0 AND 25),
  sell_impact_pct NUMERIC(6,3) NOT NULL DEFAULT 0.75 CHECK (sell_impact_pct BETWEEN 0 AND 25),
  is_limited BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_limit INTEGER,
  lifetime_buyer_count INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_buyer_count >= 0),
  market_paused BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold_out', 'retired')),
  last_tick_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (price_ceiling >= price_floor),
  CHECK ((is_limited AND buyer_limit IS NOT NULL AND buyer_limit > 0) OR (NOT is_limited AND buyer_limit IS NULL))
);

CREATE TABLE public.card_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.card_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.card_catalog(id) ON DELETE RESTRICT,
  serial_code TEXT NOT NULL UNIQUE DEFAULT ('CP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  purchase_price NUMERIC(14,2) NOT NULL CHECK (purchase_price > 0),
  sold_price NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'owned' CHECK (status IN ('owned', 'sold')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ,
  CHECK ((status = 'owned' AND sold_price IS NULL AND sold_at IS NULL) OR (status = 'sold' AND sold_price IS NOT NULL AND sold_at IS NOT NULL))
);

CREATE INDEX card_holdings_user_owned_idx ON public.card_holdings (user_id, purchased_at DESC) WHERE status = 'owned';
CREATE INDEX card_holdings_user_history_idx ON public.card_holdings (user_id, purchased_at DESC);
CREATE INDEX card_holdings_card_idx ON public.card_holdings (card_id, status);

CREATE TABLE public.card_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.card_catalog(id) ON DELETE RESTRICT,
  holding_id UUID NOT NULL REFERENCES public.card_holdings(id) ON DELETE RESTRICT,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price > 0),
  price_after NUMERIC(14,2) NOT NULL CHECK (price_after > 0),
  profit_loss NUMERIC(14,2),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX card_trades_user_created_idx ON public.card_trades (user_id, created_at DESC);
CREATE INDEX card_trades_card_created_idx ON public.card_trades (card_id, created_at DESC);
CREATE INDEX card_trades_user_card_buy_idx ON public.card_trades (user_id, card_id) WHERE side = 'buy';

CREATE TABLE public.card_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES public.card_trades(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('welcome_bonus', 'card_buy', 'card_sell')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount <> 0),
  balance_after NUMERIC(14,2) NOT NULL CHECK (balance_after >= 0),
  idempotency_key TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX card_wallet_ledger_user_created_idx ON public.card_wallet_ledger (user_id, created_at DESC);

CREATE TABLE public.card_price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.card_catalog(id) ON DELETE CASCADE,
  price NUMERIC(14,2) NOT NULL CHECK (price > 0),
  change_percent NUMERIC(9,4) NOT NULL DEFAULT 0,
  source TEXT NOT NULL CHECK (source IN ('seed', 'market_tick', 'buy_pressure', 'sell_pressure', 'admin_adjustment')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX card_price_history_card_time_idx ON public.card_price_history (card_id, recorded_at DESC);

CREATE TABLE public.card_admin_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  card_id UUID REFERENCES public.card_catalog(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('price_adjustment', 'market_controls')),
  reason TEXT NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX card_admin_audit_created_idx ON public.card_admin_audit (created_at DESC);

ALTER TABLE public.card_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_admin_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read card catalog" ON public.card_catalog FOR SELECT USING (true);
CREATE POLICY "Public can read card price history" ON public.card_price_history FOR SELECT USING (true);
CREATE POLICY "Users can read own card wallet" ON public.card_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can read own card holdings" ON public.card_holdings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can read own card trades" ON public.card_trades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can read own card ledger" ON public.card_wallet_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.card_catalog, public.card_price_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.card_catalog, public.card_price_history TO anon, authenticated;
REVOKE ALL ON TABLE public.card_wallets, public.card_holdings, public.card_trades, public.card_wallet_ledger, public.card_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.card_wallets, public.card_holdings, public.card_trades, public.card_wallet_ledger TO authenticated;
GRANT SELECT ON TABLE public.card_admin_audit TO authenticated;
GRANT ALL ON TABLE public.card_catalog, public.card_wallets, public.card_holdings, public.card_trades, public.card_wallet_ledger, public.card_price_history, public.card_admin_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.card_price_history_id_seq, public.card_admin_audit_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.is_card_market_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'card_admin'),
    FALSE
  );
$function$;
REVOKE ALL ON FUNCTION public.is_card_market_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_card_market_admin() TO authenticated;

CREATE POLICY "Card admins can read market audit" ON public.card_admin_audit
  FOR SELECT TO authenticated USING (public.is_card_market_admin());

CREATE OR REPLACE FUNCTION public.touch_card_wallet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER touch_card_wallets_updated_at
  BEFORE UPDATE ON public.card_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_card_wallet_updated_at();

INSERT INTO public.card_catalog
  (code, title, category, description, current_price, previous_price, volatility_pct, buy_impact_pct, sell_impact_pct, is_limited, buyer_limit)
VALUES
  ('MEME-001', 'Freetown Fox', 'meme', 'A fictional coastal fox collectible from the meme district.', 5.00, 5.00, 3.500, 0.900, 0.900, true, 20),
  ('MEME-002', 'Moon Frog', 'meme', 'A fictional frog mascot with a famously jumpy quote.', 6.00, 6.00, 4.500, 1.000, 1.000, true, 20),
  ('MEME-003', 'Weekend Goat', 'meme', 'A playful goat collectible for the weekend crowd.', 4.00, 4.00, 3.000, 0.800, 0.800, false, NULL),
  ('MEME-004', 'Pixel Palm', 'meme', 'A pixel-art palm collectible from a fictional island market.', 7.00, 7.00, 4.000, 0.900, 0.900, false, NULL),
  ('MEME-005', 'Sleepy Croc', 'meme', 'A sleepy crocodile meme collectible with unpredictable swings.', 8.00, 8.00, 5.000, 1.100, 1.100, false, NULL),
  ('MEME-006', 'Hype Keke', 'meme', 'A fictional city-tricycle mascot collectible.', 5.00, 5.00, 4.000, 0.900, 0.900, false, NULL),
  ('MEME-007', 'Banana Signal', 'meme', 'A banana-themed joke collectible; the signal is never financial advice.', 9.00, 9.00, 5.500, 1.000, 1.000, true, 20),
  ('MEME-008', 'Tiny Tornado', 'meme', 'A miniature storm character with a high-volatility profile.', 10.00, 10.00, 6.000, 1.200, 1.200, false, NULL),
  ('MEME-009', 'Cloud Cat', 'meme', 'A soft cloud-cat collectible for the community series.', 6.00, 6.00, 3.500, 0.800, 0.800, false, NULL),
  ('MEME-010', 'Meme Market DJ', 'meme', 'A fictional DJ who spins the market mood up and down.', 11.00, 11.00, 5.000, 1.000, 1.000, false, NULL),
  ('MEME-011', 'Lucky Lizard', 'meme', 'A lucky-looking lizard collectible; gains are never guaranteed.', 12.00, 12.00, 4.500, 0.900, 0.900, true, 20),
  ('MEME-012', 'Neon Noodle', 'meme', 'A bright noodle mascot from the fictional late-night collection.', 8.00, 8.00, 4.000, 0.900, 0.900, false, NULL),
  ('CO-001', 'Lumley Solar Co.', 'company', 'A fictional clean-energy company collectible inspired by Lumley Bay.', 10.00, 10.00, 2.500, 0.650, 0.650, true, 20),
  ('CO-002', 'Kono Cloud Labs', 'company', 'A fictional software-company collectible from the Kono series.', 12.00, 12.00, 3.000, 0.700, 0.700, false, NULL),
  ('CO-003', 'Blue Mango Foods', 'company', 'A fictional food-company collectible from the community shelf.', 7.00, 7.00, 2.200, 0.550, 0.550, false, NULL),
  ('CO-004', 'Atlantic Wave Works', 'company', 'A fictional ocean-technology company collectible.', 13.00, 13.00, 3.200, 0.700, 0.700, false, NULL),
  ('CO-005', 'Bo Market Collective', 'company', 'A fictional local-retail company collectible.', 9.00, 9.00, 2.800, 0.600, 0.600, false, NULL),
  ('CO-006', 'Freetown Motors Club', 'company', 'A fictional mobility-company collectible; not equity or ownership.', 14.00, 14.00, 3.500, 0.750, 0.750, true, 20),
  ('CO-007', 'Green Hill Telecom', 'company', 'A fictional connectivity-company collectible.', 11.00, 11.00, 2.400, 0.600, 0.600, false, NULL),
  ('CO-008', 'Riverstone Studios', 'company', 'A fictional creative-studio collectible.', 8.00, 8.00, 3.000, 0.650, 0.650, false, NULL),
  ('CO-009', 'Cocoa Coast Logistics', 'company', 'A fictional logistics-company collectible from the Cocoa Coast series.', 12.00, 12.00, 2.700, 0.600, 0.600, false, NULL),
  ('CO-010', 'Makeni Microgrid', 'company', 'A fictional distributed-energy company collectible.', 15.00, 15.00, 3.300, 0.700, 0.700, false, NULL),
  ('CO-011', 'Port Loko Robotics', 'company', 'A fictional robotics-company collectible.', 10.00, 10.00, 3.800, 0.800, 0.800, false, NULL),
  ('PAY-001', 'Bluewave Pocket', 'fintech_collectible', 'A fictional payment-themed collectible. It cannot pay, store funds, or access a bank account.', 9.00, 9.00, 3.000, 0.650, 0.650, true, 20),
  ('PAY-002', 'NexaPay Neon', 'fintech_collectible', 'A fictional neon fintech collectible; not affiliated with any payment network.', 12.00, 12.00, 4.000, 0.850, 0.850, false, NULL),
  ('PAY-003', 'Pocket Orbit', 'fintech_collectible', 'A fictional pocket-wallet character collectible with no payment capability.', 7.00, 7.00, 3.500, 0.700, 0.700, false, NULL),
  ('PAY-004', 'CloudMint Card', 'fintech_collectible', 'A fictional card-shaped digital collectible, not a bank or payment card.', 14.00, 14.00, 4.500, 0.900, 0.900, true, 20),
  ('PAY-005', 'Copper Circuit', 'fintech_collectible', 'A fictional circuit-board collectible from the fintech art series.', 11.00, 11.00, 3.800, 0.750, 0.750, false, NULL),
  ('COM-001', 'Lumley Lantern', 'community', 'A fictional community collectible celebrating night markets in Lumley.', 6.00, 6.00, 2.500, 0.550, 0.550, false, NULL),
  ('COM-002', 'Freetown Skyline', 'community', 'A fictional city-skyline collectible from the community launch series.', 15.00, 15.00, 3.200, 0.700, 0.700, true, 20)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.card_price_history (card_id, price, source)
SELECT c.id, c.current_price, 'seed'
FROM public.card_catalog AS c
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_price_history AS h WHERE h.card_id = c.id AND h.source = 'seed'
);

CREATE OR REPLACE FUNCTION public.grant_card_welcome_bonus_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_entry_id UUID;
  v_bonus CONSTANT NUMERIC(14,2) := 15.00;
BEGIN
  INSERT INTO public.card_wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.card_wallet_ledger (user_id, entry_type, amount, balance_after, idempotency_key, description)
  VALUES (NEW.id, 'welcome_bonus', v_bonus, v_bonus, 'welcome-bonus-v1', 'One-time simulated card-market welcome credits')
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.card_wallets SET balance = balance + v_bonus WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.grant_card_welcome_bonus_on_signup() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_card_welcome_bonus
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_card_welcome_bonus_on_signup();

CREATE OR REPLACE FUNCTION public.claim_card_welcome_bonus()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_entry_id UUID;
  v_balance NUMERIC(14,2);
  v_bonus CONSTANT NUMERIC(14,2) := 15.00;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.card_wallets (user_id, balance)
  VALUES (v_user_id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.card_wallet_ledger (user_id, entry_type, amount, balance_after, idempotency_key, description)
  VALUES (v_user_id, 'welcome_bonus', v_bonus, v_bonus, 'welcome-bonus-v1', 'One-time simulated card-market welcome credits')
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_entry_id;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.card_wallets SET balance = balance + v_bonus WHERE user_id = v_user_id;
  END IF;

  SELECT balance INTO v_balance FROM public.card_wallets WHERE user_id = v_user_id;
  RETURN jsonb_build_object('granted', v_entry_id IS NOT NULL, 'bonus_amount', CASE WHEN v_entry_id IS NOT NULL THEN v_bonus ELSE 0 END, 'balance', v_balance, 'currency_label', 'Le credits');
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_card_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_card_welcome_bonus() TO authenticated;

CREATE OR REPLACE FUNCTION public.buy_card(p_card_id UUID, p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_card public.card_catalog%ROWTYPE;
  v_existing public.card_trades%ROWTYPE;
  v_holding_id UUID;
  v_trade_id UUID;
  v_balance NUMERIC(14,2);
  v_quote NUMERIC(14,2);
  v_next NUMERIC(14,2);
  v_change NUMERIC(9,4);
  v_new_buyer BOOLEAN;
  v_idempotency_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_card_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'Card and request IDs are required' USING ERRCODE = '22023'; END IF;

  v_idempotency_key := p_request_id::TEXT;
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::TEXT || ':' || v_idempotency_key)::BIGINT);
  SELECT * INTO v_existing FROM public.card_trades WHERE user_id = v_user_id AND idempotency_key = v_idempotency_key;
  IF FOUND THEN
    IF v_existing.side <> 'buy' THEN RAISE EXCEPTION 'Request ID was already used for a different trade' USING ERRCODE = '22023'; END IF;
    SELECT balance INTO v_balance FROM public.card_wallets WHERE user_id = v_user_id;
    RETURN jsonb_build_object('trade_id', v_existing.id, 'holding_id', v_existing.holding_id, 'serial_code', (SELECT serial_code FROM public.card_holdings WHERE id = v_existing.holding_id), 'side', v_existing.side, 'unit_price', v_existing.unit_price, 'price_after', v_existing.price_after, 'profit_loss', 0, 'balance', v_balance, 'idempotent_replay', true);
  END IF;

  PERFORM public.claim_card_welcome_bonus();
  SELECT * INTO v_card FROM public.card_catalog WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;
  IF v_card.status <> 'active' THEN RAISE EXCEPTION 'Card is not available for purchase' USING ERRCODE = '55000'; END IF;
  IF v_card.market_paused THEN RAISE EXCEPTION 'Trading for this card is temporarily paused' USING ERRCODE = '55000'; END IF;

  v_new_buyer := NOT EXISTS (
    SELECT 1 FROM public.card_trades WHERE user_id = v_user_id AND card_id = p_card_id AND side = 'buy'
  );
  IF v_card.is_limited AND NOT v_new_buyer THEN
    RAISE EXCEPTION 'Limited cards are restricted to one purchase per account' USING ERRCODE = '23505';
  END IF;
  IF v_card.is_limited AND v_card.lifetime_buyer_count >= v_card.buyer_limit THEN
    RAISE EXCEPTION 'This limited card has sold out' USING ERRCODE = '55000';
  END IF;

  SELECT balance INTO v_balance FROM public.card_wallets WHERE user_id = v_user_id FOR UPDATE;
  v_quote := v_card.current_price;
  IF v_balance < v_quote THEN RAISE EXCEPTION 'Insufficient simulated Le credits' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.card_holdings (user_id, card_id, purchase_price)
  VALUES (v_user_id, p_card_id, v_quote)
  RETURNING id INTO v_holding_id;

  v_balance := v_balance - v_quote;
  UPDATE public.card_wallets SET balance = v_balance WHERE user_id = v_user_id;

  v_next := LEAST(v_card.price_ceiling, GREATEST(v_card.price_floor, ROUND(v_quote * (1 + v_card.buy_impact_pct / 100), 2)));
  v_change := CASE WHEN v_quote = 0 THEN 0 ELSE ROUND(((v_next - v_quote) / v_quote) * 100, 4) END;

  UPDATE public.card_catalog
  SET previous_price = v_quote,
      current_price = v_next,
      price_change_percent = v_change,
      lifetime_buyer_count = lifetime_buyer_count + CASE WHEN v_new_buyer THEN 1 ELSE 0 END,
      status = CASE WHEN is_limited AND lifetime_buyer_count + CASE WHEN v_new_buyer THEN 1 ELSE 0 END >= buyer_limit THEN 'sold_out' ELSE status END,
      updated_at = now()
  WHERE id = p_card_id;

  INSERT INTO public.card_trades (user_id, card_id, holding_id, side, unit_price, price_after, idempotency_key)
  VALUES (v_user_id, p_card_id, v_holding_id, 'buy', v_quote, v_next, v_idempotency_key)
  RETURNING id INTO v_trade_id;

  INSERT INTO public.card_wallet_ledger (user_id, trade_id, entry_type, amount, balance_after, idempotency_key, description)
  VALUES (v_user_id, v_trade_id, 'card_buy', -v_quote, v_balance, 'trade:' || v_idempotency_key, 'Purchased fictional collectible ' || v_card.code);

  INSERT INTO public.card_price_history (card_id, price, change_percent, source)
  VALUES (p_card_id, v_next, v_change, 'buy_pressure');

  RETURN jsonb_build_object('trade_id', v_trade_id, 'holding_id', v_holding_id, 'serial_code', (SELECT serial_code FROM public.card_holdings WHERE id = v_holding_id), 'side', 'buy', 'unit_price', v_quote, 'price_after', v_next, 'balance', v_balance, 'profit_loss', 0, 'idempotent_replay', false);
END;
$function$;
REVOKE ALL ON FUNCTION public.buy_card(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_card(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.sell_card(p_holding_id UUID, p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_holding public.card_holdings%ROWTYPE;
  v_card public.card_catalog%ROWTYPE;
  v_existing public.card_trades%ROWTYPE;
  v_trade_id UUID;
  v_balance NUMERIC(14,2);
  v_quote NUMERIC(14,2);
  v_next NUMERIC(14,2);
  v_change NUMERIC(9,4);
  v_profit_loss NUMERIC(14,2);
  v_idempotency_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_holding_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'Holding and request IDs are required' USING ERRCODE = '22023'; END IF;

  v_idempotency_key := p_request_id::TEXT;
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::TEXT || ':' || v_idempotency_key)::BIGINT);
  SELECT * INTO v_existing FROM public.card_trades WHERE user_id = v_user_id AND idempotency_key = v_idempotency_key;
  IF FOUND THEN
    IF v_existing.side <> 'sell' THEN RAISE EXCEPTION 'Request ID was already used for a different trade' USING ERRCODE = '22023'; END IF;
    SELECT balance INTO v_balance FROM public.card_wallets WHERE user_id = v_user_id;
    RETURN jsonb_build_object('trade_id', v_existing.id, 'holding_id', v_existing.holding_id, 'serial_code', (SELECT serial_code FROM public.card_holdings WHERE id = v_existing.holding_id), 'side', v_existing.side, 'unit_price', v_existing.unit_price, 'purchase_price', (SELECT purchase_price FROM public.card_holdings WHERE id = v_existing.holding_id), 'price_after', v_existing.price_after, 'profit_loss', v_existing.profit_loss, 'balance', v_balance, 'idempotent_replay', true);
  END IF;

  SELECT * INTO v_holding FROM public.card_holdings WHERE id = p_holding_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned card not found' USING ERRCODE = 'P0002'; END IF;
  IF v_holding.status <> 'owned' THEN RAISE EXCEPTION 'This card has already been sold' USING ERRCODE = '55000'; END IF;

  SELECT * INTO v_card FROM public.card_catalog WHERE id = v_holding.card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;
  IF v_card.market_paused THEN RAISE EXCEPTION 'Trading for this card is temporarily paused' USING ERRCODE = '55000'; END IF;
  PERFORM public.claim_card_welcome_bonus();
  SELECT balance INTO v_balance FROM public.card_wallets WHERE user_id = v_user_id FOR UPDATE;

  v_quote := v_card.current_price;
  v_profit_loss := v_quote - v_holding.purchase_price;
  UPDATE public.card_holdings SET status = 'sold', sold_price = v_quote, sold_at = now() WHERE id = p_holding_id;
  v_balance := v_balance + v_quote;
  UPDATE public.card_wallets SET balance = v_balance WHERE user_id = v_user_id;

  v_next := LEAST(v_card.price_ceiling, GREATEST(v_card.price_floor, ROUND(v_quote * (1 - v_card.sell_impact_pct / 100), 2)));
  v_change := CASE WHEN v_quote = 0 THEN 0 ELSE ROUND(((v_next - v_quote) / v_quote) * 100, 4) END;
  UPDATE public.card_catalog SET previous_price = v_quote, current_price = v_next, price_change_percent = v_change, updated_at = now() WHERE id = v_card.id;

  INSERT INTO public.card_trades (user_id, card_id, holding_id, side, unit_price, price_after, profit_loss, idempotency_key)
  VALUES (v_user_id, v_card.id, p_holding_id, 'sell', v_quote, v_next, v_profit_loss, v_idempotency_key)
  RETURNING id INTO v_trade_id;

  INSERT INTO public.card_wallet_ledger (user_id, trade_id, entry_type, amount, balance_after, idempotency_key, description)
  VALUES (v_user_id, v_trade_id, 'card_sell', v_quote, v_balance, 'trade:' || v_idempotency_key, 'Sold fictional collectible ' || v_card.code);

  INSERT INTO public.card_price_history (card_id, price, change_percent, source)
  VALUES (v_card.id, v_next, v_change, 'sell_pressure');

  RETURN jsonb_build_object('trade_id', v_trade_id, 'holding_id', p_holding_id, 'serial_code', v_holding.serial_code, 'side', 'sell', 'unit_price', v_quote, 'purchase_price', v_holding.purchase_price, 'price_after', v_next, 'profit_loss', v_profit_loss, 'balance', v_balance, 'idempotent_replay', false);
END;
$function$;
REVOKE ALL ON FUNCTION public.sell_card(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sell_card(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.tick_card_market()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_card public.card_catalog%ROWTYPE;
  v_next NUMERIC(14,2);
  v_change_pct NUMERIC(9,4);
  v_delta_pct NUMERIC(9,4);
  v_count INTEGER := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;

  FOR v_card IN
    SELECT * FROM public.card_catalog
    WHERE status = 'active' AND market_paused = FALSE
    ORDER BY id
    FOR UPDATE
  LOOP
    IF v_card.last_tick_at IS NOT NULL
       AND date_trunc('minute', v_card.last_tick_at) = date_trunc('minute', now()) THEN
      CONTINUE;
    END IF;

    v_delta_pct := ROUND(((random() * 2 - 1) * v_card.volatility_pct)::NUMERIC, 4);
    v_next := LEAST(v_card.price_ceiling, GREATEST(v_card.price_floor, ROUND(v_card.current_price * (1 + v_delta_pct / 100), 2)));
    v_change_pct := CASE WHEN v_card.current_price = 0 THEN 0 ELSE ROUND(((v_next - v_card.current_price) / v_card.current_price) * 100, 4) END;

    UPDATE public.card_catalog
    SET previous_price = v_card.current_price,
        current_price = v_next,
        price_change_percent = v_change_pct,
        last_tick_at = now(),
        updated_at = now()
    WHERE id = v_card.id;

    INSERT INTO public.card_price_history (card_id, price, change_percent, source)
    VALUES (v_card.id, v_next, v_change_pct, 'market_tick');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.tick_card_market() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tick_card_market() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_adjust_card_price(p_card_id UUID, p_new_price NUMERIC, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
  v_card public.card_catalog%ROWTYPE;
  v_change NUMERIC(9,4);
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_card_market_admin() THEN RAISE EXCEPTION 'Card admin role required' USING ERRCODE = '42501'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 8 OR length(p_reason) > 500 THEN RAISE EXCEPTION 'Provide an audit reason between 8 and 500 characters' USING ERRCODE = '22023'; END IF;
  SELECT * INTO v_card FROM public.card_catalog WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;
  IF p_new_price IS NULL OR p_new_price < v_card.price_floor OR p_new_price > v_card.price_ceiling THEN RAISE EXCEPTION 'Price is outside the configured floor and ceiling' USING ERRCODE = '22023'; END IF;

  v_change := CASE WHEN v_card.current_price = 0 THEN 0 ELSE ROUND(((ROUND(p_new_price, 2) - v_card.current_price) / v_card.current_price) * 100, 4) END;
  UPDATE public.card_catalog SET previous_price = current_price, current_price = ROUND(p_new_price, 2), price_change_percent = v_change, updated_at = now() WHERE id = p_card_id;
  INSERT INTO public.card_price_history (card_id, price, change_percent, source) VALUES (p_card_id, ROUND(p_new_price, 2), v_change, 'admin_adjustment');
  INSERT INTO public.card_admin_audit (admin_user_id, card_id, action, reason, before_state, after_state)
  VALUES (v_admin_id, p_card_id, 'price_adjustment', trim(p_reason), jsonb_build_object('current_price', v_card.current_price), jsonb_build_object('current_price', ROUND(p_new_price, 2)));

  RETURN jsonb_build_object('card_id', p_card_id, 'current_price', ROUND(p_new_price, 2), 'price_change_percent', v_change);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_adjust_card_price(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_card_price(UUID, NUMERIC, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_card_controls(
  p_card_id UUID,
  p_market_paused BOOLEAN,
  p_volatility_pct NUMERIC,
  p_buy_impact_pct NUMERIC,
  p_sell_impact_pct NUMERIC,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_admin_id UUID := auth.uid();
  v_card public.card_catalog%ROWTYPE;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_card_market_admin() THEN RAISE EXCEPTION 'Card admin role required' USING ERRCODE = '42501'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 8 OR length(p_reason) > 500 THEN RAISE EXCEPTION 'Provide an audit reason between 8 and 500 characters' USING ERRCODE = '22023'; END IF;
  IF p_market_paused IS NULL OR p_volatility_pct NOT BETWEEN 0 AND 25 OR p_buy_impact_pct NOT BETWEEN 0 AND 25 OR p_sell_impact_pct NOT BETWEEN 0 AND 25 THEN
    RAISE EXCEPTION 'Invalid market controls' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_card FROM public.card_catalog WHERE id = p_card_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card not found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.card_catalog
  SET market_paused = p_market_paused,
      volatility_pct = p_volatility_pct,
      buy_impact_pct = p_buy_impact_pct,
      sell_impact_pct = p_sell_impact_pct,
      updated_at = now()
  WHERE id = p_card_id;

  INSERT INTO public.card_admin_audit (admin_user_id, card_id, action, reason, before_state, after_state)
  VALUES (
    v_admin_id,
    p_card_id,
    'market_controls',
    trim(p_reason),
    jsonb_build_object('market_paused', v_card.market_paused, 'volatility_pct', v_card.volatility_pct, 'buy_impact_pct', v_card.buy_impact_pct, 'sell_impact_pct', v_card.sell_impact_pct),
    jsonb_build_object('market_paused', p_market_paused, 'volatility_pct', p_volatility_pct, 'buy_impact_pct', p_buy_impact_pct, 'sell_impact_pct', p_sell_impact_pct)
  );

  RETURN jsonb_build_object('card_id', p_card_id, 'market_paused', p_market_paused, 'volatility_pct', p_volatility_pct, 'buy_impact_pct', p_buy_impact_pct, 'sell_impact_pct', p_sell_impact_pct);
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_update_card_controls(UUID, BOOLEAN, NUMERIC, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_card_controls(UUID, BOOLEAN, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- Retain old investment/payment records for audit and user history, but make the
-- old balance, market, and payment tables read-only to clients. New trades use
-- the isolated card_wallets ledger and never call the Monime payment endpoints.
DO $block$
DECLARE
  v_table TEXT;
  v_policy RECORD;
  v_legacy_tables TEXT[] := ARRAY[
    'wallets', 'investments', 'transactions', 'payment_transactions',
    'forex_trades', 'companies', 'market_candles', 'company_price_history',
    'company_candles', 'company_candles_1m', 'market_events', 'chat_feed'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_legacy_tables LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon, authenticated', v_table);
      FOR v_policy IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = v_table AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
      END LOOP;
    END IF;
  END LOOP;
END;
$block$;

GRANT SELECT ON TABLE public.wallets, public.investments, public.transactions, public.payment_transactions, public.companies TO authenticated;

ALTER TABLE public.card_catalog REPLICA IDENTITY FULL;
ALTER TABLE public.card_holdings REPLICA IDENTITY FULL;
DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'card_catalog') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.card_catalog;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'card_holdings') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.card_holdings;
    END IF;
  END IF;
END;
$block$;

COMMIT;
