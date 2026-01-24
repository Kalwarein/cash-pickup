-- Create company_candles table for OHLC candlestick data per company
CREATE TABLE public.company_candles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_company_candles_company_timestamp ON public.company_candles(company_id, timestamp DESC);

-- Enable RLS
ALTER TABLE public.company_candles ENABLE ROW LEVEL SECURITY;

-- Anyone can view company candles (public market data)
CREATE POLICY "Anyone can view company candles"
ON public.company_candles
FOR SELECT
USING (true);

-- Service role can insert candles (backend only)
CREATE POLICY "Service role can insert company candles"
ON public.company_candles
FOR INSERT
WITH CHECK (true);

-- Enable realtime for company candles
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_candles;

-- Create cleanup function for company candles (keep last 500 per company)
CREATE OR REPLACE FUNCTION public.cleanup_old_company_candles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM company_candles
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY timestamp DESC) as rn
      FROM company_candles
    ) ranked
    WHERE rn > 500
  );
END;
$$;