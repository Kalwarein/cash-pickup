-- Enable realtime for company_price_history table (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'company_price_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_price_history;
  END IF;
END $$;