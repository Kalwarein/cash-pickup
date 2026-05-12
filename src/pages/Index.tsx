import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  const [assetsReady, setAssetsReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  // Wait for fonts + window load (assets/images), with safety fallbacks
  useEffect(() => {
    let cancelled = false;

    const fontsPromise: Promise<unknown> = (document as any).fonts?.ready ?? Promise.resolve();
    const loadPromise = new Promise<void>((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', () => resolve(), { once: true });
    });

    Promise.all([fontsPromise, loadPromise]).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    // Hard fallback so we never stall on the splash
    const failsafe = setTimeout(() => !cancelled && setAssetsReady(true), 4000);
    // Minimum display time so the splash never just flashes
    const minTimer = setTimeout(() => !cancelled && setMinTimeElapsed(true), 900);

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      clearTimeout(minTimer);
    };
  }, []);

  // Prefetch app-critical data so we never need an in-app loading screen
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const failsafe = setTimeout(() => !cancelled && setDataReady(true), 3500);
    const run = async () => {
      try {
        const tasks: Promise<unknown>[] = [
          supabase.from('companies').select('id').limit(1),
        ];
        if (user) {
          tasks.push(
            supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
            supabase.from('investments').select('id').eq('user_id', user.id).limit(1),
          );
        }
        await Promise.allSettled(tasks);
      } finally {
        if (!cancelled) setDataReady(true);
        clearTimeout(failsafe);
      }
    };
    run();
    return () => { cancelled = true; clearTimeout(failsafe); };
  }, [loading, user]);

  useEffect(() => {
    if (loading || onboardingLoading || !assetsReady || !minTimeElapsed || !dataReady) return;

    const target = (() => {
      if (user) return completed === false ? '/onboarding' : '/home';
      return localStorage.getItem('cp_onboarded') ? '/auth' : '/get-started';
    })();

    setFadingOut(true);
    const t = setTimeout(() => navigate(target, { replace: true }), 450);
    return () => clearTimeout(t);
  }, [user, loading, completed, onboardingLoading, assetsReady, minTimeElapsed, dataReady, navigate]);

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[radial-gradient(120%_100%_at_30%_0%,#1e40af_0%,#1d4ed8_30%,#2563eb_60%,#0ea5e9_100%)] flex items-center justify-center transition-opacity duration-500 ease-out ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={fadingOut}
    >
      {/* Layered orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-sky-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-indigo-400/25 blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-blue-500/10 blur-3xl" />

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative text-center px-6">
        {/* Logo */}
        <div className="relative w-32 h-32 mx-auto mb-7">
          <div className="absolute -inset-3 rounded-[2rem] bg-white/20 blur-2xl animate-pulse" />
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/25 to-white/5 backdrop-blur-2xl border border-white/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] flex items-center justify-center">
            <span className="text-[2.75rem] font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              CP
            </span>
          </div>
          <div className="absolute inset-0 rounded-[2rem] ring-2 ring-white/30" />
          {/* Rotating gradient ring */}
          <div
            className="absolute -inset-1 rounded-[2.25rem] opacity-70"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.7) 25%, transparent 50%)',
              animation: 'cp-spin 2.4s linear infinite',
              WebkitMask: 'radial-gradient(circle, transparent 62%, #000 64%)',
              mask: 'radial-gradient(circle, transparent 62%, #000 64%)',
            }}
          />
        </div>

        <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
          Cash Pickup
        </h1>
        <p className="mt-2 text-sm text-white/80 tracking-wide">
          Invest. Earn. Grow — in Sierra Leone.
        </p>

        {/* Smooth indeterminate progress bar */}
        <div className="mt-9 mx-auto w-44 h-1 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-white/40 via-white to-white/40"
            style={{ animation: 'cp-slide 1.4s ease-in-out infinite' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes cp-spin { to { transform: rotate(360deg); } }
        @keyframes cp-slide {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
};

export default Index;
