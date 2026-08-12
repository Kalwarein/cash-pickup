import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────
   Iridescent liquid-metal orb.
   Everything animated here is opacity/transform/filter on a fixed,
   tiny number of composited layers — the DOM never grows with tap
   rate, so it stays buttery on low-end devices.
──────────────────────────────────────────────────────────────── */

const POOL = 14; // recycled floating-reward slots — screen never gets messy

interface Slot { nonce: number; dx: number; rot: number; rise: number; x: number; y: number; label: string }

interface Props {
  onTap: () => void;
  rewardLabel: string;
  /** 0..1 — how "charged" the orb looks (driven by the tap streak). */
  intensity?: number;
  /** Current streak multiplier, surfaced on the reward tokens. */
  multiplier?: number;
}

export const MineButton = memo(({ onTap, rewardLabel, intensity = 0, multiplier = 1 }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [slots, setSlots] = useState<(Slot | null)[]>(() => Array(POOL).fill(null));
  const cursor = useRef(0);
  const nonce = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();
  const suppressClick = useRef(false);

  const fire = useCallback(() => {
    if ('vibrate' in navigator) { try { navigator.vibrate(5); } catch { /* noop */ } }

    setPressed(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 110);

    // Recycle one slot from the fixed pool — no unbounded arrays, no timers
    // per token (each slot is simply overwritten when its turn comes again).
    const rect = wrapRef.current?.getBoundingClientRect();
    const i = cursor.current;
    cursor.current = (cursor.current + 1) % POOL;
    const slot: Slot = {
      nonce: ++nonce.current,
      x: (rect ? rect.left + rect.width / 2 : window.innerWidth / 2) + (Math.random() - 0.5) * 26,
      y: rect ? rect.top + 6 : window.innerHeight / 2,
      rise: (rect ? rect.top : 300) + 90,
      dx: (Math.random() - 0.5) * 120,
      rot: (Math.random() - 0.5) * 22,
      label: multiplier > 1 ? `+${rewardLabel} ×${multiplier}` : `+${rewardLabel}`,
    };
    setSlots((s) => { const n = s.slice(); n[i] = slot; return n; });

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

  const i = Math.round(Math.max(0, Math.min(1, intensity)) * 10) / 10; // quantized → few style writes

  return (
    <div ref={wrapRef} className="relative grid place-items-center select-none">
      {slots.map((s, idx) => s && (
        <span
          key={`${idx}-${s.nonce}`}
          className="irb-token"
          style={{
            left: s.x,
            top: s.y,
            ['--dx' as string]: `${s.dx}px`,
            ['--rise' as string]: `${s.rise}px`,
            ['--rot' as string]: `${s.rot}deg`,
          }}
        >
          {s.label}
        </span>
      ))}

      <button
        type="button"
        aria-label="Tap to mine"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={cn('irb', pressed && 'irb--pressed')}
        style={{ ['--i' as string]: i }}
      >
        <span className="irb-halo" aria-hidden />
        <span className="irb-body" aria-hidden>
          <span className="irb-film" />
          <span className="irb-film irb-film--b" />
          <span className="irb-core" />
          <span className="irb-rim" />
          <span className="irb-spec" />
        </span>
        <span className="irb-label">TAP</span>
      </button>

      <style>{`
        .irb {
          position: relative;
          width: 216px; height: 216px;
          border: none; padding: 0; background: transparent;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          display: grid; place-items: center;
          transform: translateZ(0) scale(1);
          transition: transform 130ms cubic-bezier(0.34, 1.6, 0.5, 1);
          will-change: transform;
        }
        .irb--pressed { transform: translateZ(0) scale(0.935); }

        /* Outer rainbow bloom — sits behind the orb, breathes and spins */
        .irb-halo {
          position: absolute; inset: -14%;
          border-radius: 50%;
          background: conic-gradient(from 0deg,
            #00e0ff, #6a3cff, #ff2fd0, #ff3b1f, #ffd60a, #35ff9e, #00e0ff);
          filter: blur(30px);
          opacity: calc(0.30 + var(--i) * 0.55);
          transform: translateZ(0);
          animation: irbSpin 12s linear infinite, irbBreath 5.5s ease-in-out infinite;
          animation-duration: calc(12s / (0.7 + var(--i) * 1.6)), 5.5s;
          pointer-events: none;
        }

        /* The liquid body: organic morphing mask + layered refraction films */
        .irb-body {
          position: absolute; inset: 7%;
          border-radius: 48% 52% 56% 44% / 53% 46% 54% 47%;
          overflow: hidden;
          transform: translateZ(0);
          animation: irbMorph 8s ease-in-out infinite;
          animation-duration: calc(8s / (0.75 + var(--i) * 1.5));
          box-shadow:
            inset 0 -18px 40px rgba(0,0,0,0.55),
            inset 0 12px 30px rgba(255,255,255,0.18),
            0 18px 50px rgba(0,0,0,0.5);
          will-change: transform, border-radius;
        }
        .irb-core {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 38% 30%,
            rgba(255,255,255,0.55) 0%, rgba(255,190,60,0.25) 22%,
            rgba(150,20,40,0.55) 55%, rgba(10,4,16,0.9) 100%);
          mix-blend-mode: overlay;
        }
        .irb-film {
          position: absolute; inset: -18%;
          background: conic-gradient(from 20deg,
            #00e5ff, #1e5cff, #b026ff, #ff1fa8, #ff3a12, #ffdd00, #57ff8f, #00e5ff);
          filter: blur(10px) saturate(calc(1.1 + var(--i) * 0.9));
          opacity: calc(0.72 + var(--i) * 0.28);
          animation: irbSwirl 9s linear infinite;
          animation-duration: calc(9s / (0.7 + var(--i) * 1.8));
          will-change: transform;
        }
        .irb-film--b {
          inset: -26%;
          filter: blur(20px);
          mix-blend-mode: color-dodge;
          opacity: calc(0.28 + var(--i) * 0.4);
          animation-direction: reverse;
        }
        /* Thin refracting rim — the bright cyan/magenta edge from the reference */
        .irb-rim {
          position: absolute; inset: 0; border-radius: inherit;
          background: conic-gradient(from 120deg,
            #00f0ff, #2b6bff, #c02bff, #ff2fb0, #ff5a19, #ffe23a, #00f0ff);
          -webkit-mask: radial-gradient(circle at 50% 50%, transparent 66%, #000 76%, #000 96%, transparent 100%);
          mask: radial-gradient(circle at 50% 50%, transparent 66%, #000 76%, #000 96%, transparent 100%);
          opacity: calc(0.75 + var(--i) * 0.25);
          animation: irbSpin 7s linear infinite reverse;
          animation-duration: calc(7s / (0.7 + var(--i) * 1.5));
        }
        /* Wet specular highlight */
        .irb-spec {
          position: absolute; top: 10%; left: 20%; width: 42%; height: 26%;
          border-radius: 50%;
          background: radial-gradient(ellipse at 40% 40%, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%);
          filter: blur(3px);
          animation: irbSpec 6s ease-in-out infinite;
        }
        .irb-label {
          position: relative; z-index: 3;
          font-size: 11px; font-weight: 900; letter-spacing: 0.34em;
          color: rgba(255,255,255,0.92);
          text-shadow: 0 2px 10px rgba(0,0,0,0.75);
          pointer-events: none;
        }

        @keyframes irbSpin { to { transform: rotate(360deg); } }
        @keyframes irbSwirl {
          0%   { transform: rotate(0deg) scale(1.05); }
          50%  { transform: rotate(180deg) scale(1.18); }
          100% { transform: rotate(360deg) scale(1.05); }
        }
        @keyframes irbBreath {
          0%,100% { transform: scale(1); }
          50%     { transform: scale(1.07); }
        }
        @keyframes irbMorph {
          0%   { border-radius: 48% 52% 56% 44% / 53% 46% 54% 47%; transform: rotate(0deg) scale(1); }
          25%  { border-radius: 58% 42% 45% 55% / 44% 57% 43% 56%; transform: rotate(3deg) scale(1.02); }
          50%  { border-radius: 44% 56% 52% 48% / 57% 43% 57% 43%; transform: rotate(-2deg) scale(0.99); }
          75%  { border-radius: 53% 47% 44% 56% / 46% 55% 45% 54%; transform: rotate(2deg) scale(1.03); }
          100% { border-radius: 48% 52% 56% 44% / 53% 46% 54% 47%; transform: rotate(0deg) scale(1); }
        }
        @keyframes irbSpec {
          0%,100% { transform: translate(0,0) scale(1); opacity: 0.85; }
          50%     { transform: translate(14%, 8%) scale(0.88); opacity: 0.6; }
        }

        /* Floating reward token — glassy iridescent chip */
        .irb-token {
          position: fixed; z-index: 60;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 3px 11px; border-radius: 9999px;
          background: linear-gradient(135deg, rgba(0,229,255,0.92), rgba(176,38,255,0.92) 45%, rgba(255,214,10,0.92));
          box-shadow: 0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.55);
          transform: translate(-50%, 0);
          font-size: 11.5px; font-weight: 900; letter-spacing: 0.01em;
          color: rgba(255,255,255,0.96);
          text-shadow: 0 1px 2px rgba(0,0,0,0.35);
          white-space: nowrap; pointer-events: none;
          animation: irbRise 1.5s cubic-bezier(0.16,0.72,0.32,1) forwards;
          will-change: transform, opacity;
        }
        @keyframes irbRise {
          0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          10%  { transform: translate(-50%, calc(var(--rise) * -0.10)) rotate(calc(var(--rot) * 0.3)) scale(1.1); opacity: 1; }
          55%  { transform: translate(calc(-50% + var(--dx) * 0.6), calc(var(--rise) * -0.58)) rotate(calc(var(--rot) * 0.8)) scale(1); opacity: 1; }
          80%  { opacity: 0.85; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(var(--rise) * -1)) rotate(var(--rot)) scale(0.82); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .irb-halo, .irb-body, .irb-film, .irb-rim, .irb-spec { animation: none; }
          .irb-token { animation: irbFade 0.6s ease-out forwards; }
          @keyframes irbFade { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -26px); } }
        }
      `}</style>
    </div>
  );
});
MineButton.displayName = 'MineButton';
