-- 1) Remove duplicate market candles that share the same timestamp (keep the newest row)
WITH ranked AS (
  SELECT
    ctid,
    id,
    timestamp,
    ROW_NUMBER() OVER (PARTITION BY timestamp ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.market_candles
)
DELETE FROM public.market_candles mc
USING ranked r
WHERE mc.ctid = r.ctid
  AND r.rn > 1;

-- 2) Remove duplicate company candles that share the same (company_id, timestamp) (keep the newest row)
WITH ranked AS (
  SELECT
    ctid,
    id,
    company_id,
    timestamp,
    ROW_NUMBER() OVER (PARTITION BY company_id, timestamp ORDER BY created_at DESC NULLS LAST, id DESC) AS rn
  FROM public.company_candles
)
DELETE FROM public.company_candles cc
USING ranked r
WHERE cc.ctid = r.ctid
  AND r.rn > 1;

-- 3) Enforce uniqueness to prevent race-condition double inserts going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='market_candles_timestamp_unique'
  ) THEN
    CREATE UNIQUE INDEX market_candles_timestamp_unique ON public.market_candles (timestamp);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='company_candles_company_id_timestamp_unique'
  ) THEN
    CREATE UNIQUE INDEX company_candles_company_id_timestamp_unique ON public.company_candles (company_id, timestamp);
  END IF;
END $$;