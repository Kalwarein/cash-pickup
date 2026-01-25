-- Update the wallet trigger to give 500 SLE instead of 10000
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, invested_amount, total_profit, total_loss)
  VALUES (NEW.id, 500, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add is_claimed column to investments for claim functionality
ALTER TABLE public.investments 
  ADD COLUMN IF NOT EXISTS is_claimed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz DEFAULT NULL;

-- Add is_activated column to user_promo_codes
ALTER TABLE public.user_promo_codes
  ADD COLUMN IF NOT EXISTS is_activated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz DEFAULT NULL;