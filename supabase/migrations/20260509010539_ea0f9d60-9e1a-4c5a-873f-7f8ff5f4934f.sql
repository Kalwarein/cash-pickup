
-- Enable realtime broadcasts for live company prices and investments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='companies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='investments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.investments;
  END IF;
END $$;

ALTER TABLE public.companies REPLICA IDENTITY FULL;
ALTER TABLE public.investments REPLICA IDENTITY FULL;
