import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Kicks the backend market engine to generate new persisted candles.
 * This does NOT generate values in the UI; it only asks the backend to append
 * the next candles to the database. Rendering comes from DB + realtime.
 * 
 * When no users are online, the pg_cron scheduler (market-scheduler) takes over.
 */
export const useMarketEngine = (enabled: boolean = true) => {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (runningRef.current) return;
    runningRef.current = true;

    let cancelled = false;

    const tick = async () => {
      // Fire-and-forget with internal no-op guards in the functions.
      try {
        await supabase.functions.invoke('generate-market-candle');
      } catch {
        // Silent: chart still renders from DB; this just controls movement pace.
      }

      try {
        await supabase.functions.invoke('generate-company-candles');
      } catch {
        // Silent
      }
    };

    // Prime immediately so users see motion quickly.
    void tick();

    const interval = window.setInterval(() => {
      if (!cancelled) void tick();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      runningRef.current = false;
    };
  }, [enabled]);
};
