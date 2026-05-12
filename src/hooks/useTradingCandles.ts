import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TF_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
  '1M': 0, // handled differently
};

function bucketStartFor(tf: Timeframe, t: number): number {
  if (tf === '1M') {
    const d = new Date(t * 1000);
    d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0);
    return Math.floor(d.getTime() / 1000);
  }
  const s = TF_SECONDS[tf];
  return Math.floor(t / s) * s;
}

export const useTradingCandles = (companyId: string | null, timeframe: Timeframe) => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const candlesRef = useRef<Candle[]>([]);

  candlesRef.current = candles;

  const fetchCandles = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_candles', {
      p_company_id: companyId,
      p_timeframe: timeframe,
      p_limit: 500,
    });
    if (!error && data) {
      const mapped: Candle[] = (data as Array<{ bucket: string; open: number | string; high: number | string; low: number | string; close: number | string; volume: number | string }>).map((r) => ({
        time: Math.floor(new Date(r.bucket).getTime() / 1000),
        open: Number(r.open),
        high: Number(r.high),
        low: Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
      }));
      setCandles(mapped);
    }
    setLoading(false);
  }, [companyId, timeframe]);

  useEffect(() => { fetchCandles(); }, [fetchCandles]);

  // Realtime: aggregate incoming 1m bars into the active timeframe bucket
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`tc_${companyId}_${timeframe}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'company_candles_1m',
        filter: `company_id=eq.${companyId}`,
      }, (payload) => {
        const row = payload.new as { bucket_start: string; open: number | string; high: number | string; low: number | string; close: number | string; volume: number | string };
        if (!row?.bucket_start) return;
        const t = Math.floor(new Date(row.bucket_start).getTime() / 1000);
        const bucket = bucketStartFor(timeframe, t);
        const o = Number(row.open), h = Number(row.high), l = Number(row.low), c = Number(row.close), v = Number(row.volume);

        const list = [...candlesRef.current];
        const last = list[list.length - 1];
        if (last && last.time === bucket) {
          last.high = Math.max(last.high, h);
          last.low  = Math.min(last.low, l);
          last.close = c;
          last.volume += v;
          list[list.length - 1] = { ...last };
        } else if (!last || bucket > last.time) {
          list.push({ time: bucket, open: o, high: h, low: l, close: c, volume: v });
          if (list.length > 500) list.shift();
        }
        setCandles(list);
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [companyId, timeframe]);

  return { candles, loading, refetch: fetchCandles };
};
