import { useCallback, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ripple { id: number; x: number; y: number; size: number }
interface Float { id: number; x: number; label: string }

interface Props {
  onTap: () => void;
  rewardLabel: string;
  disabled?: boolean;
}

let seq = 0;

export const TapCoin = ({ onTap, rewardLabel, disabled }: Props) => {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    if (disabled) return;
    onTap();

    // Haptic feedback where supported
    if ('vibrate' in navigator) {
      try { navigator.vibrate(8); } catch { /* ignore */ }
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = rect.width * 1.2;
    const id = seq++;
    setRipples((r) => [...r.slice(-6), { id, x, y, size }]);
    setFloats((f) => [...f.slice(-8), { id, x, label: rewardLabel }]);
    setPressed(true);
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setPressed(false), 110);

    // Cleanup after animations
    window.setTimeout(() => {
      setRipples((r) => r.filter((rp) => rp.id !== id));
      setFloats((f) => f.filter((fl) => fl.id !== id));
    }, 900);
  }, [disabled, onTap, rewardLabel]);

  return (
    <div className="relative grid place-items-center py-2 select-none">
      {/* Floating rewards layer */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
        {floats.map((f) => (
          <span key={f.id} className="tap-float" style={{ left: f.x, top: '38%', fontSize: 13 }}>
            +{f.label}
          </span>
        ))}
      </div>

      <div
        role="button"
        aria-label="Tap to earn"
        tabIndex={0}
        className={cn('tap-coin', pressed && 'is-pressed')}
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          handleTap(e.clientX, e.clientY, rect);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            handleTap(rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
          }
        }}
      >
        {ripples.map((r) => (
          <span
            key={r.id}
            className="tap-ripple"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          />
        ))}
        <div className="tap-coin-inner">
          <Coins className="w-14 h-14 drop-shadow" strokeWidth={1.6} />
          <span className="text-sm font-extrabold tracking-wide">TAP</span>
        </div>
      </div>
    </div>
  );
};