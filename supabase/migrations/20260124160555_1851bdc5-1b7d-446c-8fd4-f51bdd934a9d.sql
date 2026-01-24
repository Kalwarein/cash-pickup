-- Create function to cleanup old candles (keep only latest 500)
CREATE OR REPLACE FUNCTION public.cleanup_old_candles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM market_candles
  WHERE id NOT IN (
    SELECT id FROM market_candles
    ORDER BY timestamp DESC
    LIMIT 500
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_candles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_candles() TO service_role;