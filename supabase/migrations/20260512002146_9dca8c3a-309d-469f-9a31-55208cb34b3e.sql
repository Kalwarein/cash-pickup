
-- 1-minute OHLCV table (single source of truth)
CREATE TABLE IF NOT EXISTS public.company_candles_1m (
  company_id   uuid NOT NULL,
  bucket_start timestamptz NOT NULL,
  open         numeric NOT NULL,
  high         numeric NOT NULL,
  low          numeric NOT NULL,
  close        numeric NOT NULL,
  volume       numeric NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_candles_1m_company_time
  ON public.company_candles_1m (company_id, bucket_start DESC);

ALTER TABLE public.company_candles_1m ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view 1m candles"
  ON public.company_candles_1m FOR SELECT USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_candles_1m;
ALTER TABLE public.company_candles_1m REPLICA IDENTITY FULL;

-- Retention (keep last 14 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_candles_1m()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.company_candles_1m
  WHERE bucket_start < now() - interval '14 days';
END;
$$;

-- Aggregation RPC
CREATE OR REPLACE FUNCTION public.get_candles(
  p_company_id uuid,
  p_timeframe  text DEFAULT '1m',
  p_limit      int  DEFAULT 500
)
RETURNS TABLE (
  bucket timestamptz,
  open   numeric,
  high   numeric,
  low    numeric,
  close  numeric,
  volume numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval interval;
  v_use_month boolean := false;
BEGIN
  v_interval := CASE p_timeframe
    WHEN '1m'  THEN interval '1 minute'
    WHEN '5m'  THEN interval '5 minutes'
    WHEN '15m' THEN interval '15 minutes'
    WHEN '30m' THEN interval '30 minutes'
    WHEN '1h'  THEN interval '1 hour'
    WHEN '4h'  THEN interval '4 hours'
    WHEN '1d'  THEN interval '1 day'
    WHEN '1w'  THEN interval '1 week'
    WHEN '1M'  THEN NULL
    ELSE interval '1 minute'
  END;

  IF p_timeframe = '1M' THEN
    RETURN QUERY
    WITH agg AS (
      SELECT date_trunc('month', bucket_start) AS bkt,
             (array_agg(open  ORDER BY bucket_start ASC))[1]  AS o,
             max(high) AS h,
             min(low)  AS l,
             (array_agg(close ORDER BY bucket_start DESC))[1] AS c,
             sum(volume) AS v
        FROM public.company_candles_1m
       WHERE company_id = p_company_id
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT p_limit
    )
    SELECT bkt, o, h, l, c, v FROM agg ORDER BY bkt ASC;
  ELSE
    RETURN QUERY
    WITH agg AS (
      SELECT date_bin(v_interval, bucket_start, timestamp 'epoch') AS bkt,
             (array_agg(open  ORDER BY bucket_start ASC))[1]  AS o,
             max(high) AS h,
             min(low)  AS l,
             (array_agg(close ORDER BY bucket_start DESC))[1] AS c,
             sum(volume) AS v
        FROM public.company_candles_1m
       WHERE company_id = p_company_id
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT p_limit
    )
    SELECT bkt, o, h, l, c, v FROM agg ORDER BY bkt ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_candles(uuid, text, int) TO anon, authenticated;
