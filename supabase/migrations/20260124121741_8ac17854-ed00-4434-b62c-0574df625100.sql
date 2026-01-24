-- Fix function search paths for security
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Drop overly permissive policies and replace with proper ones
DROP POLICY IF EXISTS "System can insert market events" ON public.market_events;
DROP POLICY IF EXISTS "System can insert chat messages" ON public.chat_feed;

-- Market events and chat feed should only be inserted by system (via service role), not anon users
-- For the simulation, we'll use client-side generation, so we don't need INSERT policies for regular users