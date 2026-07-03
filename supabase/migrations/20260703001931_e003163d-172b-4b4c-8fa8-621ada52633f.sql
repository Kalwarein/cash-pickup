DROP TABLE IF EXISTS public.tap_achievements;
DROP TABLE IF EXISTS public.tap_history;

ALTER TABLE public.tap_profiles
  DROP COLUMN IF EXISTS daily_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS last_daily_claim;