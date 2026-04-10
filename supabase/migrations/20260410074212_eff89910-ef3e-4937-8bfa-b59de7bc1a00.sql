
-- Add silent performer flag
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_silent_performer boolean DEFAULT false;

-- Insert 6 new companies to reach 75
INSERT INTO public.companies (name, ticker, sector, risk_level, current_price, description, cpr_today, cpr_yesterday, cpr_7day_avg, cpr_30day_avg, cpr_best, cpr_worst, cpr_volatility, cpr_trend, min_investment, is_trending, is_silent_performer)
VALUES
  ('Freetown Fisheries Ltd', 'FFL', 'Agriculture', 'Low', 85.00, 'Leading fisheries and aquaculture company in Freetown', 8.2, 6.5, 5.8, 4.2, 15.0, -3.0, 12.0, 'improving', 50, false, true),
  ('Salone Clean Energy', 'SCE', 'Energy', 'Low', 120.00, 'Renewable energy solutions across Sierra Leone', 6.5, 5.2, 4.8, 3.9, 12.0, -2.5, 10.0, 'stable', 75, false, true),
  ('Western Area Transit', 'WAT', 'Transport', 'Medium', 65.00, 'Public and commercial transport services', 4.8, 3.5, 3.2, 2.8, 10.0, -4.0, 11.0, 'stable', 40, false, false),
  ('Makeni Medical Group', 'MMG', 'Healthcare', 'Low', 95.00, 'Healthcare services and pharmaceutical distribution', 7.1, 5.8, 5.5, 4.5, 14.0, -2.0, 9.0, 'improving', 60, false, true),
  ('Sierra Leone Cement Corp', 'SLCC', 'Construction', 'Medium', 110.00, 'Cement manufacturing and construction materials', 3.5, 2.8, 2.5, 2.0, 8.0, -5.0, 13.0, 'stable', 80, false, false),
  ('Lungi Airport Services', 'LAS', 'Transport', 'Low', 78.00, 'Airport operations, cargo, and ground handling', 5.9, 4.8, 4.5, 3.8, 11.0, -2.8, 10.5, 'improving', 55, false, true);

-- Update CPR for all companies: cap losses at -10% for this week, shift bias positive
-- Reset all companies with very negative CPR to be within -10% to +50%
UPDATE public.companies SET cpr_today = LEAST(50, GREATEST(-10, cpr_today)) WHERE cpr_today < -10;
UPDATE public.companies SET cpr_yesterday = LEAST(50, GREATEST(-10, cpr_yesterday)) WHERE cpr_yesterday < -10;
UPDATE public.companies SET cpr_7day_avg = LEAST(50, GREATEST(-10, cpr_7day_avg)) WHERE cpr_7day_avg < -10;
UPDATE public.companies SET cpr_worst = GREATEST(-10, cpr_worst);

-- Mark 17 companies as silent performers (reliable profit generators)
-- Pick a diverse set of existing companies + the new ones we added
UPDATE public.companies SET is_silent_performer = true, cpr_today = GREATEST(3, ABS(cpr_today)), cpr_7day_avg = GREATEST(2, ABS(cpr_7day_avg))
WHERE ticker IN ('FFL', 'SCE', 'MMG', 'LAS', 'BAC', 'BHL', 'SLWC', 'SPA', 'KFC', 'SLB', 'SLC', 'SLNP', 'SLT', 'SLTB', 'SFI', 'SKE', 'WAT');

-- Fix handle_new_user to give 500 SLE consistently
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
  VALUES (NEW.id, 500.00);
  
  INSERT INTO public.transactions (user_id, type, amount, description)
  VALUES (NEW.id, 'deposit', 500.00, 'Welcome bonus - 500 SLE to start investing!');
  
  RETURN NEW;
END;
$function$;
