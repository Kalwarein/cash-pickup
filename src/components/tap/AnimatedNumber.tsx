import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  decimals?: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  compact?: boolean;
}

/** Smoothly tweens a number toward its target using rAF. */
export const AnimatedNumber = ({
  value, decimals = 0, className, duration = 500, prefix = '', suffix = '', compact = false,
}: Props) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    startRef.current = null;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const fmt = (n: number) => {
    if (compact) {
      const a = Math.abs(n);
      if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
      if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
      if (a >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    }
    return n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return <span className={className}>{prefix}{fmt(display)}{suffix}</span>;
};