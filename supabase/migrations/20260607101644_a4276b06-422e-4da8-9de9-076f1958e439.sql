
-- 1. Events log
CREATE TABLE public.company_invest_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('invest','claim')),
  amount numeric(18,2) NOT NULL DEFAULT 0,
  profit numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invest_events_company ON public.company_invest_events(company_id, created_at);

GRANT SELECT ON public.company_invest_events TO anon, authenticated;
GRANT ALL ON public.company_invest_events TO service_role;
ALTER TABLE public.company_invest_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view invest events" ON public.company_invest_events FOR SELECT USING (true);

-- 2. Weekly buckets
CREATE TABLE public.company_weekly_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  total_invested numeric(18,2) NOT NULL DEFAULT 0,
  invest_count integer NOT NULL DEFAULT 0,
  realized_profit numeric(18,2) NOT NULL DEFAULT 0,
  realized_loss numeric(18,2) NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  claim_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, week_start)
);
CREATE INDEX idx_weekly_stats_company ON public.company_weekly_stats(company_id, week_start);

GRANT SELECT ON public.company_weekly_stats TO anon, authenticated;
GRANT ALL ON public.company_weekly_stats TO service_role;
ALTER TABLE public.company_weekly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view weekly stats" ON public.company_weekly_stats FOR SELECT USING (true);

-- 3. Trigger logic to record invest/claim events into weekly buckets
CREATE OR REPLACE FUNCTION public.record_investment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wk date;
  pl numeric;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    wk := date_trunc('week', NEW.created_at)::date;
    INSERT INTO public.company_invest_events (company_id, user_id, event_type, amount)
    VALUES (NEW.company_id, NEW.user_id, 'invest', NEW.amount);

    INSERT INTO public.company_weekly_stats (company_id, week_start, total_invested, invest_count)
    VALUES (NEW.company_id, wk, NEW.amount, 1)
    ON CONFLICT (company_id, week_start) DO UPDATE SET
      total_invested = company_weekly_stats.total_invested + EXCLUDED.total_invested,
      invest_count = company_weekly_stats.invest_count + 1,
      updated_at = now();
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW.is_claimed = true AND COALESCE(OLD.is_claimed, false) = false) THEN
      wk := date_trunc('week', COALESCE(NEW.claimed_at, now()))::date;
      pl := COALESCE(NEW.final_profit_loss, 0);

      INSERT INTO public.company_invest_events (company_id, user_id, event_type, amount, profit)
      VALUES (NEW.company_id, NEW.user_id, 'claim', NEW.amount, pl);

      INSERT INTO public.company_weekly_stats
        (company_id, week_start, realized_profit, realized_loss, wins, losses, claim_count)
      VALUES (
        NEW.company_id, wk,
        GREATEST(pl, 0), GREATEST(-pl, 0),
        CASE WHEN pl > 0 THEN 1 ELSE 0 END,
        CASE WHEN pl < 0 THEN 1 ELSE 0 END,
        1
      )
      ON CONFLICT (company_id, week_start) DO UPDATE SET
        realized_profit = company_weekly_stats.realized_profit + EXCLUDED.realized_profit,
        realized_loss = company_weekly_stats.realized_loss + EXCLUDED.realized_loss,
        wins = company_weekly_stats.wins + EXCLUDED.wins,
        losses = company_weekly_stats.losses + EXCLUDED.losses,
        claim_count = company_weekly_stats.claim_count + 1,
        updated_at = now();
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_record_investment_event
AFTER INSERT OR UPDATE ON public.investments
FOR EACH ROW EXECUTE FUNCTION public.record_investment_event();

-- 4. Read helpers
CREATE OR REPLACE FUNCTION public.get_company_global_stats(p_company_id uuid)
RETURNS TABLE (
  total_invested numeric,
  active_investors integer,
  total_investors integer,
  wins integer,
  losses integer,
  realized_profit numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(amount) FROM investments WHERE company_id = p_company_id), 0),
    (SELECT COUNT(DISTINCT user_id)::int FROM investments WHERE company_id = p_company_id AND is_claimed = false),
    (SELECT COUNT(DISTINCT user_id)::int FROM investments WHERE company_id = p_company_id),
    COALESCE((SELECT SUM(wins) FROM company_weekly_stats WHERE company_id = p_company_id), 0)::int,
    COALESCE((SELECT SUM(losses) FROM company_weekly_stats WHERE company_id = p_company_id), 0)::int,
    COALESCE((SELECT SUM(realized_profit - realized_loss) FROM company_weekly_stats WHERE company_id = p_company_id), 0);
$$;

CREATE OR REPLACE FUNCTION public.get_company_weekly_series(p_company_id uuid, p_limit integer DEFAULT 26)
RETURNS TABLE (
  week_start date,
  total_invested numeric,
  invest_count integer,
  realized_profit numeric,
  realized_loss numeric,
  wins integer,
  losses integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT week_start, total_invested, invest_count, realized_profit, realized_loss, wins, losses
  FROM company_weekly_stats
  WHERE company_id = p_company_id
  ORDER BY week_start ASC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_global_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_weekly_series(uuid, integer) TO anon, authenticated;

-- 5. Backfill from existing investments
INSERT INTO public.company_weekly_stats (company_id, week_start, total_invested, invest_count)
SELECT company_id, date_trunc('week', created_at)::date, SUM(amount), COUNT(*)
FROM public.investments
GROUP BY company_id, date_trunc('week', created_at)::date
ON CONFLICT (company_id, week_start) DO UPDATE SET
  total_invested = company_weekly_stats.total_invested + EXCLUDED.total_invested,
  invest_count = company_weekly_stats.invest_count + EXCLUDED.invest_count;

INSERT INTO public.company_weekly_stats
  (company_id, week_start, realized_profit, realized_loss, wins, losses, claim_count)
SELECT
  company_id,
  date_trunc('week', COALESCE(claimed_at, matured_at, updated_at))::date,
  SUM(GREATEST(COALESCE(final_profit_loss,0),0)),
  SUM(GREATEST(-COALESCE(final_profit_loss,0),0)),
  COUNT(*) FILTER (WHERE COALESCE(final_profit_loss,0) > 0),
  COUNT(*) FILTER (WHERE COALESCE(final_profit_loss,0) < 0),
  COUNT(*)
FROM public.investments
WHERE is_claimed = true
GROUP BY company_id, date_trunc('week', COALESCE(claimed_at, matured_at, updated_at))::date
ON CONFLICT (company_id, week_start) DO UPDATE SET
  realized_profit = company_weekly_stats.realized_profit + EXCLUDED.realized_profit,
  realized_loss = company_weekly_stats.realized_loss + EXCLUDED.realized_loss,
  wins = company_weekly_stats.wins + EXCLUDED.wins,
  losses = company_weekly_stats.losses + EXCLUDED.losses,
  claim_count = company_weekly_stats.claim_count + EXCLUDED.claim_count;
