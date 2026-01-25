-- Add guaranteed investment fields to companies
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS min_investment numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS guaranteed_return_percent numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS investment_durations jsonb DEFAULT '[7,14,30,90]'::jsonb,
ADD COLUMN IF NOT EXISTS banner_url text;

-- Add guaranteed return fields to investments
ALTER TABLE public.investments
ADD COLUMN IF NOT EXISTS guaranteed_return numeric,
ADD COLUMN IF NOT EXISTS guaranteed_return_percent numeric;

-- Create company activity feed table for simulated updates
CREATE TABLE IF NOT EXISTS public.company_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  message text NOT NULL,
  activity_type text DEFAULT 'update',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_activities ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view company activities (public data)
CREATE POLICY "Anyone can view company activities"
ON public.company_activities
FOR SELECT
USING (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_company_activities_company_id ON public.company_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_company_activities_created_at ON public.company_activities(created_at DESC);

-- Update existing companies with sample guaranteed returns and investment parameters
UPDATE public.companies SET
  min_investment = CASE 
    WHEN risk_level = 'Low' THEN 100
    WHEN risk_level = 'Medium' THEN 50
    ELSE 25
  END,
  guaranteed_return_percent = CASE
    WHEN risk_level = 'Low' THEN 15
    WHEN risk_level = 'Medium' THEN 25
    ELSE 40
  END,
  investment_durations = '[7, 14, 30, 90]'::jsonb
WHERE min_investment IS NULL OR min_investment = 50;