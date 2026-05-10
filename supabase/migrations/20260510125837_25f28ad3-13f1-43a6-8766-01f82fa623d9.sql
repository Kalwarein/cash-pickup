
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS market_cap numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_target_cap numeric,
  ADD COLUMN IF NOT EXISTS weekly_target_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'INT',
  ADD COLUMN IF NOT EXISTS logo_url text;
