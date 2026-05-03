ALTER TABLE public.payment_transactions REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_transactions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;