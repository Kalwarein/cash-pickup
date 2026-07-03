import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pickaxe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { heatLevel, HeatLevel } from '@/lib/tapEarn';

interface Float { id: number; x: number; y: number; dx: number; rise: number; rot: number }

interface Props {
  onTap: () => void;
  rewardLabel: string;
  onState?: (s: { heat: number; level: HeatLevel; combo: number }) => void;
}

let seq = 0;
const HEAT_PER_TAP = 9;
const HEAT_MAX = 100;

export const MineButton = memo(({ onTap, rewardLabel, onState }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [idle, setIdle] = useState(true);   // liquid "mixing" animation plays only while idle
  const [floats, setFloats] = useState<Float[]>([]);
  const [ripple, setRipple] = useState(0);

  const heatRef = useRef(0);
  const comboRef = useRef(0);
  const lastTapAt = useRef(0);
  const decayInterval = useRef<ReturnType<typeof setInterval>>();
  const comboResetTimer = useRef<ReturnType<typeof setTimeout>>();
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();
  const suppressClick = useRef(false);

  const armIdleReturn = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 2200);
  }, []);

  // Event-driven cooldown instead of a permanent requestAnimationFrame loop.
  // The interval only exists while there's heat to shed (~5 ticks/sec, not
  // 60), and switches itself off completely the moment you're idle — that
  // "always running" loop was the real cost before.
  const startCooldown = useCallback(() => {
    if (decayInterval.current) return;
    decayInterval.current = setInterval(() => {
      heatRef.current = Math.max(0, heatRef.current - 6);
      onState?.({ heat: heatRef.current, level: heatLevel(heatRef.current), combo: comboRef.current });
      if (heatRef.current <= 0 && decayInterval.current) {
        clearInterval(decayInterval.current);
        decayInterval.current = undefined;
      }
    }, 180);
  }, [onState]);

  const fire = useCallback(() => {
    if (idle) setIdle(false);
    armIdleReturn();

    if ('vibrate' in navigator) { try { navigator.vibrate(6); } catch { /* noop */ } }

    heatRef.current = Math.min(HEAT_MAX, heatRef.current + HEAT_PER_TAP);
    const now = Date.now();
    const gap = now - lastTapAt.current;
    lastTapAt.current = now;
    comboRef.current = gap < 650 ? comboRef.current + 1 : 1;
    const combo = comboRef.current;

    if (comboResetTimer.current) clearTimeout(comboResetTimer.current);
    comboResetTimer.current = setTimeout(() => {
      comboRef.current = 0;
      heatRef.current = 0;
      onState?.({ heat: 0, level: 'normal', combo: 0 });
    }, 1000);

    onState?.({ heat: heatRef.current, level: heatLevel(heatRef.current), combo });
    startCooldown();

    setPressed(true);
    setRipple((r) => r + 1); // remounts the single ripple span — never queues up
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 85);

    // Floating reward token — fires on EVERY tap, no exceptions, so it holds
    // up under an autoclicker just as reliably as a real finger. Anchored to
    // the button's actual screen position (fixed, not local), launching from
    // its top edge. The cap here is just a safety net against unbounded
    // growth during sustained automated spam — at the animation's 1.9s life,
    // even 50 taps/sec only ever needs ~95 concurrent, so 160 never engages
    // in practice.
    {
      const id = ++seq;
      const rect = wrapRef.current?.getBoundingClientRect();
      const originX = (rect ? rect.left + rect.width / 2 : window.innerWidth / 2) + (Math.random() - 0.5) * 20;
      const originY = rect ? rect.top - 4 : window.innerHeight / 2; // launches from the button's top edge
      const rise = (rect ? rect.top : window.innerHeight / 2) + 100;
      const dx = (Math.random() - 0.5) * 130;
      const rot = (Math.random() - 0.5) * 26;
      setFloats((f) => (f.length > 160 ? f.slice(-160) : f).concat({ id, x: originX, y: originY, dx, rise, rot }));
      setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1900);
    }

    onTap();
  }, [idle, armIdleReturn, startCooldown, onState, onTap]);

  // Fire on pointerdown, not click — removes the browser's synthetic-event
  // delay so the tap registers the instant a finger lands.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    suppressClick.current = true;
    fire();
  }, [fire]);

  // Fallback for keyboard / assistive-tech activation, which only fires "click".
  const handleClick = useCallback(() => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    fire();
  }, [fire]);

  useEffect(() => () => {
    if (decayInterval.current) clearInterval(decayInterval.current);
    if (comboResetTimer.current) clearTimeout(comboResetTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
  }, []);

  return (
    <div ref={wrapRef} className="relative grid place-items-center select-none">
      {floats.map((f) => (
        <span
          key={f.id}
          className="mnb-coin"
          style={{
            left: f.x,
            top: f.y,
            ['--dx' as string]: `${f.dx}px`,
            ['--rise' as string]: `${f.rise}px`,
            ['--rot' as string]: `${f.rot}deg`,
          }}
        >
          +{rewardLabel}
        </span>
      ))}

      <button
        type="button"
        aria-label="Tap to mine"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className={cn('mnb', pressed && 'mnb--pressed')}
      >
        <span key={ripple} className="mnb-ripple" />
        <span className="mnb-ring" />
        <span className="mnb-face">
          {idle && (
            <span className="mnb-liquid" aria-hidden>
              <span className="mnb-blob mnb-blob--a" />
              <span className="mnb-blob mnb-blob--b" />
              <span className="mnb-blob mnb-blob--c" />
            </span>
          )}
          <Pickaxe className="mnb-icon" strokeWidth={2} />
          <span className="mnb-label">MINE</span>
        </span>
      </button>

      <style>{`
        .mnb {
          position: relative;
          width: 172px; height: 172px;
          border-radius: 9999px;
          border: none; padding: 0;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          background: transparent;
          transform: translateZ(0) scale(1);
          transition: transform 90ms cubic-bezier(0.34,1.56,0.64,1);
          will-change: transform;
        }
        .mnb--pressed { transform: translateZ(0) scale(0.92); }

        /* Static — drawn once, never recalculated per tap */
        .mnb-ring {
          position: absolute; inset: -6px; border-radius: 9999px;
          background: linear-gradient(145deg, hsl(45 90% 60%), hsl(28 85% 48%));
          box-shadow: 0 10px 28px hsla(32, 80%, 45%, 0.35);
        }
        .mnb-face {
          position: absolute; inset: 6px; border-radius: 9999px;
          overflow: hidden;
          background: radial-gradient(circle at 32% 28%, hsl(46 95% 62%), hsl(30 88% 46%) 70%);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          box-shadow: inset 0 2px 10px rgba(255,255,255,0.35), inset 0 -10px 22px rgba(0,0,0,0.22);
        }
        .mnb-icon { width: 54px; height: 54px; color: rgba(0,0,0,0.72); position: relative; z-index: 2; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15)); }
        .mnb-label { position: relative; z-index: 2; font-size: 12px; font-weight: 900; letter-spacing: 0.18em; color: rgba(0,0,0,0.55); }

        /* One ripple element per tap — remounted via key, never accumulates */
        .mnb-ripple {
          position: absolute; inset: 6px; border-radius: 9999px;
          background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%);
          transform: scale(0.6); opacity: 0.6;
          animation: mnbRipple 0.38s ease-out forwards;
          pointer-events: none;
        }
        @keyframes mnbRipple {
          to { transform: scale(1.18); opacity: 0; }
        }

        /* Liquid "mixing chemicals" idle blobs — transform-only, GPU-composited,
           and only present in the DOM while idle: zero cost once tapping starts. */
        .mnb-liquid { position: absolute; inset: 0; z-index: 1; }
        .mnb-blob {
          position: absolute; width: 78%; height: 78%;
          border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%;
          mix-blend-mode: soft-light;
          will-change: transform;
        }
        .mnb-blob--a { top: -10%; left: -8%; background: hsl(52 95% 65%); animation: mnbDriftA 5.5s ease-in-out infinite; }
        .mnb-blob--b { bottom: -14%; right: -10%; background: hsl(14 90% 55%); animation: mnbDriftB 6.5s ease-in-out infinite; }
        .mnb-blob--c { top: 18%; right: -16%; width: 60%; height: 60%; background: hsl(340 80% 55%); animation: mnbDriftC 7.2s ease-in-out infinite; }
        @keyframes mnbDriftA { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(10%,8%) rotate(40deg) scale(1.08); } }
        @keyframes mnbDriftB { 0%,100% { transform: translate(0,0) rotate(0deg) scale(1); } 50% { transform: translate(-8%,-10%) rotate(-35deg) scale(1.1); } }
        @keyframes mnbDriftC { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-12%,6%) scale(0.92); } }
        @media (prefers-reduced-motion: reduce) {
          .mnb-blob, .mnb-ripple { animation: none; }
        }

        /* Floating reward token — a rounded gold coin/chip, launched from the
           button's top edge, pinned to the viewport (not the button) so it
           can climb the full screen height with a weave, like a livestream
           like-burst. Only fades in the very last stretch. */
        .mnb-coin {
          position: fixed;
          z-index: 60;
          display: inline-flex; align-items: center; justify-content: center;
          padding: 3px 10px;
          border-radius: 9999px;
          background: linear-gradient(145deg, hsl(50 95% 68%), hsl(30 90% 52%));
          box-shadow: 0 3px 10px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.5);
          transform: translate(-50%, 0);
          font-size: 12px; font-weight: 900; letter-spacing: 0.01em;
          color: rgba(0,0,0,0.72);
          white-space: nowrap;
          pointer-events: none;
          animation: mnbCoinRise 1.9s cubic-bezier(0.16,0.72,0.32,1) forwards;
          will-change: transform, opacity;
        }
        @keyframes mnbCoinRise {
          0%   { transform: translate(-50%, 0) rotate(0deg) scale(0.5); opacity: 0; }
          6%   { opacity: 1; transform: translate(-50%, calc(var(--rise) * -0.12)) rotate(calc(var(--rot) * 0.2)) scale(1.15); }
          14%  { transform: translate(-50%, calc(var(--rise) * -0.22)) rotate(calc(var(--rot) * 0.35)) scale(1); }
          40%  { transform: translate(calc(-50% + var(--dx) * 0.45), calc(var(--rise) * -0.48)) rotate(calc(var(--rot) * 0.65)) scale(1); }
          68%  { transform: translate(calc(-50% + var(--dx) * 0.85), calc(var(--rise) * -0.78)) rotate(var(--rot)) scale(0.94); }
          86%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx)), calc(var(--rise) * -1.08)) rotate(calc(var(--rot) * 1.2)) scale(0.8); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mnb-coin { animation: mnbCoinFade 0.6s ease-out forwards; }
        }
        @keyframes mnbCoinFade {
          0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -24px); }
        }
      `}</style>
    </div>
  );
});
MineButton.displayName = 'MineButton';
