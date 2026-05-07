
CREATE OR REPLACE FUNCTION public.expire_stale_payment_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payment_transactions
  SET status = 'expired',
      updated_at = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('expired_by', 'auto_sweep', 'expired_at', now())
  WHERE type = 'deposit'
    AND status = 'pending'
    AND created_at < (now() - interval '10 minutes');
END;
$$;
