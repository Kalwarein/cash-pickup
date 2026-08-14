import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pickaxe } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────
   Circular liquid-glass mine button.
   • Fixed DOM: 4 pooled ripple layers + 12 pooled float slots.
   • Every animation is transform/opacity only → GPU composited.
   • No state writes per tap beyond two small pooled arrays.
──────────────────────────────────────────────────────────────── */

const RIPPLE_RINGS = 4;   // quadruple ripple
const FLOAT_POOL = 12;

interface Float { n: number; dx: number; rot: number; label: string }

interface Props {
  onTap: () => void;
  rewardLabel: string;
  /** 0..1 — visual charge driven by the tap streak. */
  intensity?: number;
  multiplier?: number;
}

export const MineButton = memo(({ onTap, rewardLabel, intensity = 0, multiplier = 1 }: Props) => {
  const [pressed, setPressed] = useState(false);
  const [burst, setBurst] = useState(0); // increments per tap → restarts ripple keyframes
  const [floats, setFloats] = useState<(Float | null)[]>(() => Array(FLOAT_POOL).fill(null));
  const cursor = useRef(0);
  const nonce = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();
  const suppressClick = useRef(false);

  const fire = useCallback(() => {
    if ('vibrate' in navigator) { try { navigator.vibrate(4); } catch { /* noop */ } }

    setPressed(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 110);

    setBurst((b) => (b + 1) % 1000);

    const i = cursor.current;
    cursor.current = (cursor.current + 1) % FLOAT_POOL;
    const f: Float = {
      n: ++nonce.current,
      dx: (Math.random() - 0.5) * 90,
      rot: (Math.random() - 0.5) * 18,
      label: multiplier > 1 ? `+${rewardLabel} ×${multiplier}` : `+${rewardLabel}`,
    };
    setFloats((s) => { const n = s.slice(); n[i] = f; return n; });

    onTap();
  }, [onTap, rewardLabel, multiplier]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    suppressClick.current = true;
    fire();
  }, [fire]);

  const handleClick = useCallback(() => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    fire();
  }, [fire]);

  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);

  const i = Math.round(Math.max(0, Math.min(1, intensity)) * 5) / 5; // quantized

  return (
    <div className="relative grid place-items-center select-none">
      {/* pooled floating reward labels */}
      <div className="lg-floats" aria-hidden>
        {floats.map((f, idx) => f && (
          <span
            key={`${idx}-${f.n}`}
            className="lg-float"
            style={{ ['--dx' as string]: `${f.dx}px`, ['--rot' as string]: `${f.rot}deg` }}
          >
            {f.label}
          </span>
        ))}
      </div>

      <button
        type="button"
        aria-label="Mine"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={cn('lg-btn', pressed && 'lg-btn--down')}
        style={{ ['--i' as string]: i }}
      >
        <span className="lg-glow" aria-hidden />
        <span className="lg-ring" aria-hidden />
        <span className="lg-glass" aria-hidden>
          <span className="lg-sheen" />
          <span className="lg-inner" />
        </span>

        {/* quadruple ripple — 4 fixed layers, keyframes restarted by key */}
        <span className="lg-ripples" aria-hidden key={burst}>
          {Array.from({ length: RIPPLE_RINGS }).map((_, r) => (
            <span key={r} className="lg-ripple" style={{ animationDelay: `${r * 70}ms` }} />
          ))}
        </span>

        <span className="lg-content">
          <Pickaxe className="lg-icon" strokeWidth={2.2} />
          <span className="lg-word">MINE</span>
        </span>
      </button>

      <style>{`
        .lg-btn {
          position: relative;
          width: min(220px, 64vw); height: 120px; border-radius: 9999px;
          border: none; padding: 0; background: transparent;
          display: grid; place-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transform: translateZ(0) scale(1) translateY(0);
          transition: transform 170ms cubic-bezier(0.34, 1.7, 0.46, 1);
          will-change: transform;
        }
        /* press reaction: pushes back / down, springs forward on release */
        .lg-btn--down { transform: translateZ(0) scale(0.94) translateY(5px); }

        /* soft ambient bloom */
        .lg-glow {
          position: absolute; inset: -14%; border-radius: 9999px;
          background: radial-gradient(ellipse at 50% 50%,
            hsl(var(--primary) / 0.42), hsl(var(--primary) / 0.16) 50%, transparent 72%);
          filter: blur(24px);
          opacity: calc(0.55 + var(--i) * 0.45);
          transform: translateZ(0);
          animation: lgBreath 5s ease-in-out infinite;
          pointer-events: none;
        }

        /* iridescent hairline edge */
        /* subtle brand hairline edge (no rainbow) */
        .lg-ring {
          position: absolute; inset: 0; border-radius: 9999px; padding: 1.5px;
          background: linear-gradient(150deg,
            hsl(0 0% 100% / 0.55), hsl(var(--primary) / 0.5) 45%, hsl(0 0% 100% / 0.18));
          opacity: calc(0.7 + var(--i) * 0.3);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }

        /* frosted glass body */
        /* solid blue button body */
        .lg-glass {
          position: absolute; inset: 2px; border-radius: 9999px; overflow: hidden;
          background: linear-gradient(165deg,
            hsl(var(--primary) / 1), hsl(var(--primary) / 0.86) 55%, hsl(var(--primary) / 0.72));
          box-shadow:
            inset 0 1px 0 hsl(0 0% 100% / 0.4),
            inset 0 -18px 40px hsl(var(--primary) / 0.45),
            0 18px 44px -16px hsl(var(--primary) / 0.55);
        }
        .lg-inner {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 30%,
            hsl(0 0% 100% / 0.22), transparent 65%);
          opacity: calc(0.6 + var(--i) * 0.4);
        }
        .lg-sheen {
          position: absolute; top: 7%; left: 16%; width: 60%; height: 32%;
          border-radius: 9999px;
          background: radial-gradient(ellipse at 40% 40%, hsl(0 0% 100% / 0.45), hsl(0 0% 100% / 0) 72%);
          filter: blur(5px);
        }

        /* quadruple ripple */
        .lg-ripples { position: absolute; inset: 0; border-radius: 9999px; pointer-events: none; }
        .lg-ripple {
          position: absolute; inset: 0; border-radius: 9999px;
          border: 1.5px solid hsl(var(--primary) / 0.55);
          transform: scale(0.68);
          opacity: 0;
          animation: lgRipple 700ms cubic-bezier(0.22,0.68,0.28,1) forwards;
          will-change: transform, opacity;
        }

        .lg-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          pointer-events: none;
        }
        .lg-icon {
          width: 30px; height: 30px;
          color: hsl(var(--primary-foreground));
          filter: drop-shadow(0 2px 6px hsl(0 0% 0% / 0.35));
        }
        .lg-word {
          font-size: 12px; font-weight: 900; letter-spacing: 0.32em;
          color: hsl(var(--primary-foreground));
          text-shadow: 0 2px 8px hsl(0 0% 0% / 0.35);
        }

        @keyframes lgBreath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes lgRipple {
          0%   { transform: scale(0.66); opacity: 0.85; }
          100% { transform: scale(1.32); opacity: 0; }
        }

        /* pooled float labels */
        .lg-floats {
          position: absolute; left: 50%; top: 0; width: 0; height: 0;
          z-index: 5; pointer-events: none;
        }
        .lg-float {
          position: absolute; left: 0; top: 0;
          transform: translate(-50%, 0);
          padding: 3px 11px; border-radius: 9999px;
          white-space: nowrap;
          font-size: 11.5px; font-weight: 900;
          color: hsla(0,0%,100%,0.96);
          background: linear-gradient(120deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          box-shadow: 0 6px 18px -6px hsla(240,60%,4%,0.8), inset 0 1px 0 hsla(0,0%,100%,0.5);
          animation: lgFloat 1200ms cubic-bezier(0.16,0.72,0.32,1) forwards;
          will-change: transform, opacity;
        }
        @keyframes lgFloat {
          0%   { transform: translate(-50%, 0) scale(0.7); opacity: 0; }
          14%  { transform: translate(-50%, -14px) scale(1.06); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), -104px) rotate(var(--rot)) scale(0.86); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lg-glow, .lg-ripple { animation: none; }
        }
      `}</style>
    </div>
  );
});
MineButton.displayName = 'MineButton';
