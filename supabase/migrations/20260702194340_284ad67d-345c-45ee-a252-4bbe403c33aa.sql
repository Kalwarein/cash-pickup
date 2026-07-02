
-- ============ tap_profiles ============
CREATE TABLE public.tap_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_units numeric(38,12) NOT NULL DEFAULT 0,
  lifetime_units numeric(38,12) NOT NULL DEFAULT 0,
  today_units numeric(38,12) NOT NULL DEFAULT 0,
  lifetime_taps bigint NOT NULL DEFAULT 0,
  today_taps bigint NOT NULL DEFAULT 0,
  today_date date NOT NULL DEFAULT current_date,
  leverage_level integer NOT NULL DEFAULT 1,
  daily_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_daily_claim date,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tap_profiles TO authenticated;
GRANT ALL ON public.tap_profiles TO service_role;

ALTER TABLE public.tap_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tap profile"
  ON public.tap_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_tap_profiles_updated_at
  BEFORE UPDATE ON public.tap_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ tap_history ============
CREATE TABLE public.tap_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  amount_units numeric(38,12) NOT NULL DEFAULT 0,
  amount_sle numeric(15,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tap_history TO authenticated;
GRANT ALL ON public.tap_history TO service_role;

ALTER TABLE public.tap_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tap history"
  ON public.tap_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tap history"
  ON public.tap_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_tap_history_user_created ON public.tap_history (user_id, created_at DESC);

-- ============ tap_achievements ============
CREATE TABLE public.tap_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tap_achievements TO authenticated;
GRANT ALL ON public.tap_achievements TO service_role;

ALTER TABLE public.tap_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
  ON public.tap_achievements FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements"
  ON public.tap_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============ leaderboard function ============
CREATE OR REPLACE FUNCTION public.get_tap_leaderboard(p_metric text DEFAULT 'units', p_limit integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  total_units numeric,
  lifetime_taps bigint,
  leverage_level integer,
  rank bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tp.user_id,
    COALESCE(p.name, 'Investor') AS user_name,
    tp.total_units,
    tp.lifetime_taps,
    tp.leverage_level,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN p_metric = 'taps' THEN tp.lifetime_taps
             WHEN p_metric = 'leverage' THEN tp.leverage_level::bigint
             ELSE NULL END DESC NULLS LAST,
        CASE WHEN p_metric = 'units' THEN tp.total_units ELSE NULL END DESC NULLS LAST
    ) AS rank
  FROM public.tap_profiles tp
  LEFT JOIN public.profiles p ON p.id = tp.user_id
  ORDER BY rank ASC
  LIMIT p_limit;
$$;
