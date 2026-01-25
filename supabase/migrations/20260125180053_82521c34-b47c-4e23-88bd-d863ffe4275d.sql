-- ============================================
-- MIGRATION: Replace CPI with CPR (Company Performance Rate)
-- and add Promo Code system
-- ============================================

-- Drop old CPI-related columns and add CPR columns to companies
ALTER TABLE public.companies 
  DROP COLUMN IF EXISTS cpi_score,
  DROP COLUMN IF EXISTS cpi_updated_at,
  DROP COLUMN IF EXISTS guaranteed_return_percent,
  ADD COLUMN IF NOT EXISTS cpr_today numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_yesterday numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_7day_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_30day_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_best numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_worst numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_volatility numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpr_trend text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS cpr_last_generated_date date DEFAULT CURRENT_DATE;

-- Drop old cpi_history table
DROP TABLE IF EXISTS public.cpi_history;

-- Create CPR history table
CREATE TABLE IF NOT EXISTS public.cpr_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cpr_value numeric NOT NULL,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, recorded_date)
);

-- Enable RLS on cpr_history
ALTER TABLE public.cpr_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view CPR history
CREATE POLICY "Anyone can view cpr history" 
  ON public.cpr_history 
  FOR SELECT 
  USING (true);

-- Create promo_codes catalog table (system-defined promo codes)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  effect_type text NOT NULL, -- 'loss_reduction', 'profit_boost', 'min_floor', 'multiplier'
  effect_value numeric NOT NULL,
  duration_days integer NOT NULL,
  max_uses integer DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can view promo codes catalog
CREATE POLICY "Anyone can view promo codes" 
  ON public.promo_codes 
  FOR SELECT 
  USING (true);

-- Create user_promo_codes table (user-owned promo codes)
CREATE TABLE IF NOT EXISTS public.user_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  purchased_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  uses_remaining integer DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on user_promo_codes
ALTER TABLE public.user_promo_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own promo codes
CREATE POLICY "Users can view own promo codes" 
  ON public.user_promo_codes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert own promo codes
CREATE POLICY "Users can insert own promo codes" 
  ON public.user_promo_codes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update own promo codes
CREATE POLICY "Users can update own promo codes" 
  ON public.user_promo_codes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Remove guaranteed_return from investments if exists
ALTER TABLE public.investments 
  DROP COLUMN IF EXISTS guaranteed_return,
  DROP COLUMN IF EXISTS guaranteed_return_percent,
  ADD COLUMN IF NOT EXISTS maturity_cpr numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_effect_applied text DEFAULT NULL;

-- Insert the 17 promo codes
INSERT INTO public.promo_codes (code, name, description, price, effect_type, effect_value, duration_days) VALUES
  ('SHIELD10', 'Loss Shield 10%', 'Reduces maximum loss by 10% on all investments', 500, 'loss_reduction', 10, 7),
  ('SHIELD25', 'Loss Shield 25%', 'Reduces maximum loss by 25% on all investments', 1200, 'loss_reduction', 25, 7),
  ('SHIELD50', 'Loss Shield 50%', 'Reduces maximum loss by 50% on all investments', 2500, 'loss_reduction', 50, 7),
  ('SHIELD75', 'Loss Shield 75%', 'Reduces maximum loss by 75% on all investments', 5000, 'loss_reduction', 75, 14),
  ('BOOST5', 'Profit Boost 5%', 'Adds 5% to any positive CPR outcome', 300, 'profit_boost', 5, 7),
  ('BOOST10', 'Profit Boost 10%', 'Adds 10% to any positive CPR outcome', 750, 'profit_boost', 10, 7),
  ('BOOST15', 'Profit Boost 15%', 'Adds 15% to any positive CPR outcome', 1500, 'profit_boost', 15, 14),
  ('BOOST25', 'Profit Boost 25%', 'Adds 25% to any positive CPR outcome', 3000, 'profit_boost', 25, 30),
  ('FLOOR5', 'Safety Floor 5%', 'Guarantees minimum 5% return regardless of CPR', 2000, 'min_floor', 5, 7),
  ('FLOOR10', 'Safety Floor 10%', 'Guarantees minimum 10% return regardless of CPR', 4000, 'min_floor', 10, 14),
  ('FLOOR15', 'Safety Floor 15%', 'Guarantees minimum 15% return regardless of CPR', 8000, 'min_floor', 15, 30),
  ('MULTI1.2', 'Multiplier 1.2x', 'Multiplies positive outcomes by 1.2x', 1000, 'multiplier', 1.2, 7),
  ('MULTI1.5', 'Multiplier 1.5x', 'Multiplies positive outcomes by 1.5x', 2500, 'multiplier', 1.5, 14),
  ('MULTI2', 'Multiplier 2x', 'Doubles positive outcomes', 5000, 'multiplier', 2.0, 14),
  ('COMBO1', 'Starter Pack', 'Loss Shield 20% + Profit Boost 5%', 1500, 'loss_reduction', 20, 7),
  ('COMBO2', 'Advanced Pack', 'Loss Shield 40% + Profit Boost 10%', 3500, 'loss_reduction', 40, 14),
  ('PREMIUM', 'Premium Shield', 'Ultimate protection: 80% loss reduction + 2x multiplier on wins', 10000, 'loss_reduction', 80, 30)
ON CONFLICT (code) DO NOTHING;

-- Enable realtime for CPR history
ALTER PUBLICATION supabase_realtime ADD TABLE public.cpr_history;