-- Fix permissive RLS INSERT policies (remove true checks)
DO $$
BEGIN
  -- market_candles: drop permissive insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='market_candles' AND policyname='Authenticated users can insert market candles'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can insert market candles" ON public.market_candles';
  END IF;

  -- company_candles: drop permissive insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_candles' AND policyname='Service role can insert company candles'
  ) THEN
    EXECUTE 'DROP POLICY "Service role can insert company candles" ON public.company_candles';
  END IF;

  -- company_price_history: tighten insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='company_price_history' AND policyname='Authenticated users can insert company price history'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can insert company price history" ON public.company_price_history';
  END IF;

  EXECUTE 'CREATE POLICY "Authenticated users can insert company price history" ON public.company_price_history FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
END $$;