import { useMemo, useState } from 'react';
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import { seededSeries } from './parts';

type TF = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
type ChartKind = 'area' | 'line' | 'candles';

const TIMEFRAMES: TF[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
const TF_POINTS: Record<TF, number> = { '1D': 48, '1W': 56, '1M': 60, '3M': 66, '6M': 78, '1Y': 90, ALL: 120 };
const TF_AMP: Record<TF, number> = { '1D': 0.7, '1W': 1.1, '1M': 1.6, '3M': 2.2, '6M': 3, '1Y': 4, ALL: 5 };

interface Props {
  averageCPR: number;
  seed: number;
  isUp: boolean;
}

export const MarketIndexChart = ({ averageCPR, seed, isUp }: Props) => {
  const [tf, setTf] = useState<TF>('1M');
  const [kind, setKind] = useState<ChartKind>('area');

  const series = useMemo(() => {
    const n = TF_POINTS[tf];
    const base = averageCPR;
    const vals = seededSeries(seed + tf.length * 7, n, base, TF_AMP[tf]);
    return vals.map((v, i) => {
      const open = i === 0 ? v : vals[i - 1];
      const close = v;
      const hi = Math.max(open, close) + Math.abs(TF_AMP[tf]) * 0.4;
      const lo = Math.min(open, close) - Math.abs(TF_AMP[tf]) * 0.4;
      return { i, label: `${i}`, value: Math.round(close * 100) / 100, open, close, high: hi, low: lo };
    });
  }, [tf, averageCPR, seed]);

  const stroke = isUp ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div className="mic-toolbar">
        <div className="mic-tf-row">
          {TIMEFRAMES.map((t) => (
            <button key={t} onClick={() => setTf(t)} className={cn('mic-tf', tf === t && 'mic-tf--on')}>{t}</button>
          ))}
        </div>
        <div className="mic-kind-row">
          {(['area', 'line', 'candles'] as ChartKind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cn('mic-kind', kind === k && 'mic-kind--on')}>
              {k === 'area' ? 'Area' : k === 'line' ? 'Line' : 'Candles'}
            </button>
          ))}
        </div>
      </div>

      <div className="mic-canvas">
        {kind === 'candles' ? (
          <CandleChart data={series} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'area' ? (
              <AreaChart data={series} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="micGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                <XAxis dataKey="label" hide />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip cursor={{ stroke, strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, padding: '6px 10px' }}
                  labelFormatter={() => ''} formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, 'Index']} />
                <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={2.4} fill="url(#micGrad)" dot={false} isAnimationActive animationDuration={500} />
              </AreaChart>
            ) : (
              <LineChart data={series} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                <XAxis dataKey="label" hide />
                <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip cursor={{ stroke, strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, padding: '6px 10px' }}
                  labelFormatter={() => ''} formatter={(v: number) => [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, 'Index']} />
                <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={2.4} dot={false} isAnimationActive animationDuration={500} />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      <style>{`
        .mic-toolbar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
        .mic-tf-row { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
        .mic-tf-row::-webkit-scrollbar { display: none; }
        .mic-tf { flex: 1; min-width: 40px; font-size: 11px; font-weight: 800; padding: 6px 8px; border-radius: 9px; border: none; background: transparent; color: hsl(var(--muted-foreground)); cursor: pointer; transition: all .18s var(--ease-out); }
        .mic-tf--on { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); box-shadow: 0 4px 12px -4px hsl(var(--primary)/0.6); }
        .mic-kind-row { display: flex; gap: 6px; }
        .mic-kind { font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--muted-foreground)); cursor: pointer; transition: all .18s var(--ease-out); }
        .mic-kind--on { background: hsl(var(--primary)/0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary)/0.4); }
        .mic-canvas { height: 190px; margin: 0 -4px; }
      `}</style>
    </div>
  );
};

/* Lightweight SVG candlestick renderer */
function CandleChart({ data }: { data: Array<{ open: number; close: number; high: number; low: number }> }) {
  const W = 340, H = 190, pad = 6;
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const range = max - min || 1;
  const n = data.length;
  const slot = (W - pad * 2) / n;
  const bw = Math.max(2, slot * 0.6);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      {data.map((d, i) => {
        const cx = pad + slot * i + slot / 2;
        const up = d.close >= d.open;
        const color = up ? '#22c55e' : '#ef4444';
        const yO = y(d.open), yC = y(d.close);
        const top = Math.min(yO, yC);
        const bh = Math.max(1.5, Math.abs(yC - yO));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(d.high)} y2={y(d.low)} stroke={color} strokeWidth={1} />
            <rect x={cx - bw / 2} y={top} width={bw} height={bh} fill={color} rx={0.8} />
          </g>
        );
      })}
    </svg>
  );
}
