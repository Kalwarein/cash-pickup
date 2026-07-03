import { useCallback, useEffect, useRef, useState } from 'react';
import { Pickaxe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { heatLevel, HeatLevel } from '@/lib/tapEarn';

interface Spark { id: number; sx: number; sy: number; color: string; size: number }
interface Ring { id: number; color: string }
interface Float { id: number; x: number; label: string; big: boolean }

interface Props {
  onTap: () => void;
  rewardLabel: string;
  /** Reports heat (0-100), level and current combo — throttled. */
  onState?: (s: { heat: number; level: HeatLevel; combo: number }) => void;
}

let seq = 0;
const HEAT_PER_TAP = 7;
const hueFor = (h: number) =>
  h >= 90 ? 8 : h >= 70 ? 18 : h >= 45 ? 30 : h >= 20 ? 43 : 210;
const sparkColor = (h: number) =>
  h >= 90 ? '#fca5a5' : h >= 70 ? '#fb923c' : h >= 45 ? '#f59e0b' : h >= 20 ? '#fbbf24' : '#93c5fd';

export const MineButton = ({ onTap, rewardLabel, onState }: Props) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const heatRef = useRef(0);
  const comboRef = useRef(0);
  const lastTapAt = useRef(0);
  const lastReport = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pressed, setPressed] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);

  // rAF loop: cool the heat, drive the glow via CSS vars (no re-render).
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      let h = heatRef.current;
      if (h > 0) {
        // Hotter = cools slower (intense sessions linger longer).
        const decay = Math.max(6, 22 - h * 0.16);
        h = Math.max(0, h - decay * dt);
        heatRef.current = h;
      }
      const el = btnRef.current;
      if (el) {
        el.style.setProperty('--mine-heat', h.toFixed(1));
        el.style.setProperty('--mine-heat-h', String(hueFor(h)));
      }
      if (t - lastReport.current > 100) {
        lastReport.current = t;
        onState?.({ heat: h, level: heatLevel(h), combo: comboRef.current });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onState]);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const registerTap = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    onTap();
    if ('vibrate' in navigator) { try { navigator.vibrate(6); } catch { /* noop */ } }

    const h = Math.min(100, heatRef.current + HEAT_PER_TAP);
    heatRef.current = h;

    const now = Date.now();
    const gap = now - lastTapAt.current;
    lastTapAt.current = now;
    comboRef.current = gap < 600 ? comboRef.current + 1 : 1;
    const combo = comboRef.current;
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => { comboRef.current = 0; }, 1000);

    setPressed(true);
    setTimeout(() => setPressed(false), 90);

    const x = clientX - rect.left;
    const col = sparkColor(h);
    const id = ++seq;

    // Floating value — every tap when calm, every 2nd during frenzy to save frames.
    if (combo < 20 || combo % 2 === 0) {
      setFloats((f) => [...f.slice(-8), { id, x, label: rewardLabel, big: h >= 70 }]);
      setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 700);
    }

    // Spark burst — scales with heat, milestone rings on combo steps.
    const count = h >= 90 ? 10 : h >= 45 ? 6 : h >= 20 ? 4 : 2;
    const burst: Spark[] = Array.from({ length: count }).map((_, i) => {
      const a = (Math.PI * 2 * i) / count + Math.random();
      const dist = 44 + Math.random() * (24 + h * 0.5);
      return { id: ++seq, sx: Math.cos(a) * dist, sy: Math.sin(a) * dist, color: col, size: 4 + Math.random() * 4 };
    });
    setSparks((s) => [...s.slice(-40), ...burst]);
    setTimeout(() => setSparks((s) => s.filter((sp) => !burst.some((b) => b.id === sp.id))), 620);

    if (combo === 8 || combo === 20 || combo === 40 || combo === 80) {
      const rid = ++seq;
      setRings((r) => [...r.slice(-4), { id: rid, color: col }]);
      setTimeout(() => setRings((r) => r.filter((ring) => ring.id !== rid)), 720);
    }
  }, [onTap, rewardLabel]);

  return (
    <div className="relative grid place-items-center select-none">
      {/* Particle / ring overlay */}
      <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center overflow-visible">
        {rings.map((r) => (
          <span key={r.id} className="mine-ring" style={{ width: '78%', height: '78%', border: `2px solid ${r.color}` }} />
        ))}
        {sparks.map((s) => (
          <span
            key={s.id}
            className="mine-spark"
            style={{ width: s.size, height: s.size, background: s.color,
              ['--sx' as string]: `${s.sx}px`, ['--sy' as string]: `${s.sy}px` }}
          />
        ))}
      </div>
      {/* Floating values */}
      <div className="pointer-events-none absolute inset-0 z-40 overflow-visible">
        {floats.map((f) => (
          <span key={f.id} className="tap-float"
            style={{ left: f.x, top: '34%', fontSize: f.big ? 16 : 13 }}>
            +{f.label}
          </span>
        ))}
      </div>

      <button
        ref={btnRef}
        type="button"
        aria-label="Mine"
        className={cn('mine-btn', pressed && 'is-pressed')}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.preventDefault();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          registerTap(e.clientX, e.clientY, rect);
        }}
      >
        <span className="mine-btn-inner">
          <Pickaxe className="w-16 h-16 drop-shadow" strokeWidth={1.6} />
          <span className="text-sm font-black tracking-widest">MINE</span>
        </span>
      </button>
    </div>
  );
};
