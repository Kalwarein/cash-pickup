-- ============================================
-- REMOVE FOREX SYSTEM & ADD CPI (Company Performance Index)
-- ============================================

-- Step 1: Add CPI columns to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS cpi_score NUMERIC(5,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS cpi_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Create CPI history table
CREATE TABLE IF NOT EXISTS public.cpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cpi_score NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_cpi_history_company_id ON public.cpi_history(company_id);
CREATE INDEX IF NOT EXISTS idx_cpi_history_recorded_at ON public.cpi_history(recorded_at);

-- Enable RLS on CPI history
ALTER TABLE public.cpi_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view CPI history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cpi_history' AND policyname = 'Anyone can view cpi history'
  ) THEN
    CREATE POLICY "Anyone can view cpi history" 
    ON public.cpi_history 
    FOR SELECT 
    USING (true);
  END IF;
END $$;

-- Step 3: Remove realtime from forex_trades and market_candles (handle if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'forex_trades') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.forex_trades;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'market_candles') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.market_candles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Step 4: Drop forex_trades table
DROP TABLE IF EXISTS public.forex_trades CASCADE;

-- Step 5: Drop market_candles table
DROP TABLE IF EXISTS public.market_candles CASCADE;

-- Step 6: Enable realtime for cpi_history (handle if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cpi_history;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Step 7: Update leaderboard function to remove forex references
CREATE OR REPLACE FUNCTION public.update_leaderboard_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.leaderboard_cache;
  
  INSERT INTO public.leaderboard_cache (user_id, user_name, total_profit, total_investments, total_trades, win_rate)
  SELECT 
    p.id as user_id,
    p.name as user_name,
    COALESCE(w.total_profit, 0) - COALESCE(w.total_loss, 0) as total_profit,
    (SELECT COUNT(*) FROM investments WHERE user_id = p.id) as total_investments,
    0 as total_trades,
    CASE 
      WHEN (SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true) = 0 THEN 0
      ELSE (
        (SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true AND final_profit_loss > 0)::decimal /
        NULLIF((SELECT COUNT(*) FROM investments WHERE user_id = p.id AND is_matured = true), 0) * 100
      )
    END as win_rate
  FROM profiles p
  LEFT JOIN wallets w ON w.user_id = p.id;
  
  UPDATE public.leaderboard_cache lc
  SET rank_by_profit = subq.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_profit DESC) as rank
    FROM public.leaderboard_cache
  ) subq
  WHERE lc.id = subq.id;
  
  UPDATE public.leaderboard_cache lc
  SET rank_by_volume = subq.rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_investments DESC) as rank
    FROM public.leaderboard_cache
  ) subq
  WHERE lc.id = subq.id;
END;
$function$;

-- Step 8: Initialize CPI scores based on existing data
UPDATE public.companies c
SET cpi_score = GREATEST(10, LEAST(100,
  50 + 
  (COALESCE((SELECT COUNT(*) FROM investments WHERE company_id = c.id AND status = 'active'), 0) * 2) +
  (COALESCE((SELECT COUNT(*) FROM investments WHERE company_id = c.id AND is_matured = true), 0) * 1.5) +
  (CASE WHEN c.is_trending THEN 10 ELSE 0 END) +
  (CASE WHEN c.guaranteed_return_percent >= 30 THEN 5 ELSE 0 END)
)),
cpi_updated_at = NOW();