import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { useTheme } from '@/contexts/ThemeContext';
import { useTradingCandles, type Timeframe, type Candle } from '@/hooks/useTradingCandles';
import { cn } from '@/lib/utils';

type ChartType = 'candles' | 'heikin' | 'bars' | 'line' | 'area';

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '30m', label: '30m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1M', label: '1M' },
];

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'candles', label: 'Candles' },
  { id: 'heikin',  label: 'Heikin' },
  { id: 'bars',    label: 'Bars' },
  { id: 'line',    label: 'Line' },
  { id: 'area',    label: 'Area' },
];

function toHeikin(src: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevH: Candle | null = null;
  for (const c of src) {
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = prevH ? (prevH.open + prevH.close) / 2 : (c.open + c.close) / 2;
    const high = Math.max(c.high, open, close);
    const low = Math.min(c.low, open, close);
    const h: Candle = { time: c.time, open, high, low, close, volume: c.volume };
    out.push(h);
    prevH = h;
  }
  return out;
}

interface Props {
  companyId: string;
  ticker: string;
  name: string;
}

export const TradingChart = ({ companyId, ticker, name }: Props) => {
  const { theme } = useTheme();
  const [tf, setTf] = useState<Timeframe>('5m');
  const [type, setType] = useState<ChartType>('candles');
  const { candles, loading } = useTradingCandles(companyId, tf);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [hover, setHover] = useState<Candle | null>(null);

  const data = useMemo(() => (type === 'heikin' ? toHeikin(candles) : candles), [candles, type]);

  // Build / rebuild chart on theme or type change
  useEffect(() => {
    if (!containerRef.current) return;
    const dark = theme === 'dark';
    const text = dark ? '#cbd5e1' : '#475569';
    const grid = dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.10)';
    const bg = 'transparent';

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: { background: { color: bg }, textColor: text, attributionLogo: false },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderVisible: false, timeVisible: tf !== '1d' && tf !== '1w' && tf !== '1M', secondsVisible: false },
      rightPriceScale: { borderVisible: false },
    });
    chartRef.current = chart;

    let series: ISeriesApi<'Candlestick' | 'Bar' | 'Line' | 'Area'>;
    if (type === 'candles' || type === 'heikin') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981', downColor: '#ef4444',
        wickUpColor: '#10b981', wickDownColor: '#ef4444',
        borderVisible: false,
      });
    } else if (type === 'bars') {
      series = chart.addSeries(BarSeries, { upColor: '#10b981', downColor: '#ef4444' });
    } else if (type === 'line') {
      series = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
    } else {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#3b82f6', topColor: 'rgba(59,130,246,0.4)', bottomColor: 'rgba(59,130,246,0.0)', lineWidth: 2,
      });
    }
    priceSeriesRef.current = series;

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: dark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volSeriesRef.current = vol;

    const handler = (p: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
      const d = p.seriesData.get(series) as { time: Time; open?: number; high?: number; low?: number; close?: number; value?: number } | undefined;
      if (!d) { setHover(null); return; }
      setHover({
        time: Number(d.time),
        open: d.open ?? d.value ?? 0,
        high: d.high ?? d.value ?? 0,
        low:  d.low  ?? d.value ?? 0,
        close: d.close ?? d.value ?? 0,
        volume: 0,
      });
    };
    chart.subscribeCrosshairMove(handler);

    return () => {
      chart.unsubscribeCrosshairMove(handler);
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, [theme, type, tf]);

  // Push data
  useEffect(() => {
    const s = priceSeriesRef.current;
    const v = volSeriesRef.current;
    if (!s || !v) return;
    if (type === 'line' || type === 'area') {
      s.setData(data.map((c) => ({ time: c.time as Time, value: c.close })));
    } else {
      s.setData(data.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    }
    v.setData(data.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)',
    })));
    chartRef.current?.timeScale().fitContent();
  }, [data, type]);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const change = last && first ? ((last.close - first.close) / first.close) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div>
          <p className="text-xs text-muted-foreground">{name}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight">{last ? last.close.toFixed(2) : '—'}</p>
            <span className="text-xs font-mono text-muted-foreground">{ticker}</span>
          </div>
        </div>
        <div className={cn('text-sm font-semibold px-2.5 py-1 rounded-lg',
          change >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10')}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border/50 overflow-x-auto">
        {TIMEFRAMES.map((t) => (
          <button key={t.id} onClick={() => setTf(t.id)}
            className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors',
              tf === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
            {t.label}
          </button>
        ))}
        <div className="mx-2 w-px h-4 bg-border" />
        {CHART_TYPES.map((c) => (
          <button key={c.id} onClick={() => setType(c.id)}
            className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors',
              type === c.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Chart canvas */}
      <div className="relative h-[360px] w-full">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && candles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/60 backdrop-blur-sm z-10">
            <div className="relative w-10 h-10">
              <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Loading chart…</p>
          </div>
        ) : null}
        {hover && (
          <div className="absolute left-3 top-3 text-[10px] font-mono bg-background/80 backdrop-blur px-2 py-1 rounded-md border border-border/50 leading-tight">
            <div>O {hover.open.toFixed(2)}  H {hover.high.toFixed(2)}</div>
            <div>L {hover.low.toFixed(2)}  C {hover.close.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  );
};
