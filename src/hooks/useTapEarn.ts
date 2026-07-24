import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TapProfile, emptyProfile, rewardPerTap,
} from '@/lib/tapEarn';

const PENDING_KEY = 'tap_pending_v1';
const SYNC_INTERVAL = 1200; // ms between server syncs while tapping

interface SyncResult {
  profile: TapProfile;
  unlocked?: { key: string; title: string; reward: number }[];
}

function readPending(): number {
  try { return Math.max(0, parseInt(localStorage.getItem(PENDING_KEY) || '0', 10)) || 0; }
  catch { return 0; }
}
function writePending(n: number) {
  try { localStorage.setItem(PENDING_KEY, String(Math.max(0, n))); } catch { /* ignore */ }
}

export function useTapEarn() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<TapProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  // Optimistic local display values (updated instantly on tap)
  const [displayUnits, setDisplayUnits] = useState(0);
  const [displayTaps, setDisplayTaps] = useState(0);
  const [displayTodayTaps, setDisplayTodayTaps] = useState(0);
  const [displayTodayUnits, setDisplayTodayUnits] = useState(0);

  const pendingRef = useRef<number>(readPending()); // taps not yet confirmed by server
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyProfile = useCallback((p: TapProfile) => {
    setProfile(p);
    // Re-base optimistic display on authoritative + still-pending taps
    const per = rewardPerTap(p.leverage_level);
    const pend = pendingRef.current;
    setDisplayUnits(p.total_units + pend * per);
    setDisplayTaps(p.lifetime_taps + pend);
    setDisplayTodayTaps(p.today_taps + pend);
    setDisplayTodayUnits(p.today_units + pend * per);
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current || !user) return;
    const taps = pendingRef.current;
    if (taps <= 0) return;
    if (!navigator.onLine) return; // keep queued until back online
    inFlightRef.current = true;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tap-earn', {
        body: { action: 'sync', taps },
      });
      if (error) throw error;
      const res = data as SyncResult;
      // Subtract the taps we just confirmed (new taps may have arrived meanwhile)
      pendingRef.current = Math.max(0, pendingRef.current - taps);
      writePending(pendingRef.current);
      if (res?.profile) applyProfile(res.profile);
      return res;
    } catch {
      // leave pending intact; will retry
    } finally {
      inFlightRef.current = false;
      setSyncing(false);
    }
  }, [user, applyProfile]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      await flush();
      if (pendingRef.current > 0) scheduleFlush();
    }, SYNC_INTERVAL);
  }, [flush]);

  /** Register a single tap — instant optimistic update, batched sync. */
  const tap = useCallback(() => {
    pendingRef.current += 1;
    writePending(pendingRef.current);
    const per = rewardPerTap(profile.leverage_level);
    setDisplayUnits((v) => v + per);
    setDisplayTaps((v) => v + 1);
    setDisplayTodayTaps((v) => v + 1);
    setDisplayTodayUnits((v) => v + per);
    scheduleFlush();
  }, [profile.leverage_level, scheduleFlush]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('tap-earn', { body: { action: 'get' } });
      const res = data as SyncResult;
      if (res?.profile) applyProfile(res.profile);
      // flush any taps queued while offline / previous session
      if (pendingRef.current > 0) flush();
    } finally {
      setLoading(false);
    }
  }, [user, applyProfile, flush]);

  const buyLeverage = useCallback(async (level: number) => {
    await flush(); // settle taps first for accurate balance
    const { data, error } = await supabase.functions.invoke('tap-earn', {
      body: { action: 'buy_leverage', level },
    });
    if (error) return { error: 'Upgrade failed' };
    const res = data as SyncResult & { error?: string };
    if (res?.error) return { error: res.error };
    if (res?.profile) applyProfile(res.profile);
    return { error: null, unlocked: res?.unlocked };
  }, [flush, applyProfile]);

  const transferToWallet = useCallback(async (amount: number) => {
    await flush();
    const { data, error } = await supabase.functions.invoke('tap-earn', {
      body: { action: 'transfer_to_wallet', amount },
    });
    if (error) return { error: 'Transfer failed' };
    const res = data as SyncResult & { error?: string; transferred?: number; new_balance?: number };
    if (res?.error) return { error: res.error };
    if (res?.profile) applyProfile(res.profile);
    return { error: null, transferred: res?.transferred, new_balance: res?.new_balance };
  }, [flush, applyProfile]);

  useEffect(() => { load(); }, [load]);

  // Online / offline handling
  useEffect(() => {
    const on = () => { setOnline(true); flush(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [flush]);

  // Flush on unmount / tab hide so no taps are lost
  useEffect(() => {
    const onHide = () => { if (pendingRef.current > 0) flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current > 0) flush();
    };
  }, [flush]);

  return {
    profile, loading, syncing, online,
    displayUnits, displayTaps, displayTodayTaps, displayTodayUnits,
    pending: pendingRef.current,
    tap, buyLeverage, transferToWallet, refetch: load, flush,
  };
}