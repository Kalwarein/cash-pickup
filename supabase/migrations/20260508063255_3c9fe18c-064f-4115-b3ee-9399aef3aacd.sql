ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_first text := NULLIF(meta->>'first_name','');
  v_last  text := NULLIF(meta->>'last_name','');
  v_user  text := NULLIF(meta->>'username','');
  v_phone text := NULLIF(meta->>'phone','');
  v_dob   text := NULLIF(meta->>'date_of_birth','');
  v_name  text := COALESCE(NULLIF(meta->>'name',''), TRIM(CONCAT_WS(' ', v_first, v_last)), 'User');
BEGIN
  INSERT INTO public.profiles (id, name, email, first_name, last_name, username, phone, date_of_birth)
  VALUES (
    NEW.id,
    v_name,
    NEW.email,
    v_first,
    v_last,
    v_user,
    v_phone,
    CASE WHEN v_dob IS NOT NULL THEN v_dob::date ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_onboarding (user_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;