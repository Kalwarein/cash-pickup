
-- Create onboarding questionnaire table
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  age_range TEXT,
  occupation TEXT,
  investment_experience TEXT,
  risk_tolerance TEXT,
  investment_goal TEXT,
  monthly_budget TEXT,
  preferred_sectors TEXT[],
  income_source TEXT,
  financial_knowledge TEXT,
  investment_timeline TEXT,
  notification_preference TEXT,
  referral_source TEXT,
  investment_motivation TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding" ON public.user_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding" ON public.user_onboarding FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user to remove 500 SLE bonus and create onboarding row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'), NEW.email);
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Also update the other wallet creation function to use 0
CREATE OR REPLACE FUNCTION public.create_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.wallets (user_id, balance, invested_amount, total_profit, total_loss)
  VALUES (NEW.id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Create payment_transactions table for Monime tracking
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'deposit' or 'withdrawal'
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SLE',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, expired
  monime_payment_code_id TEXT,
  monime_payout_id TEXT,
  ussd_code TEXT,
  phone_number TEXT,
  provider TEXT,
  reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payment_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
