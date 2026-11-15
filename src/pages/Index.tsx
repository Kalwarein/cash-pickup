import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const target = user ? '/market' : localStorage.getItem('cp_onboarded') ? '/auth' : '/get-started';
    const timer = window.setTimeout(() => navigate(target, { replace: true }), 250);
    return () => window.clearTimeout(timer);
  }, [loading, navigate, user]);

  return (
    <main
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[radial-gradient(120%_100%_at_30%_0%,#1e40af_0%,#1d4ed8_30%,#2563eb_60%,#0ea5e9_100%)]"
      role="status"
      aria-label="Opening Cash Pickup card market"
      aria-busy="true"
    >
      <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] animate-pulse rounded-full bg-sky-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[32rem] w-[32rem] animate-pulse rounded-full bg-indigo-400/25 blur-3xl" style={{ animationDelay: '1.2s' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative px-6 text-center">
        <div className="relative mx-auto mb-7 h-28 w-28">
          <div className="absolute -inset-3 animate-pulse rounded-[2rem] bg-white/20 blur-2xl" />
          <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] border border-white/40 bg-gradient-to-br from-white/25 to-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
            <span className="text-4xl font-black tracking-tight text-white drop-shadow-md">CP</span>
          </div>
          <div className="absolute -inset-1 rounded-[2.25rem] opacity-70" style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.7) 25%, transparent 50%)', animation: 'cp-spin 2.4s linear infinite', WebkitMask: 'radial-gradient(circle, transparent 62%, #000 64%)', mask: 'radial-gradient(circle, transparent 62%, #000 64%)' }} />
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white drop-shadow-md">Cash Pickup</h1>
        <p className="mt-2 text-sm tracking-wide text-white/80">Collect. Trade. Discover.</p>
        <div className="mx-auto mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-white/40 via-white to-white/40" style={{ animation: 'cp-slide 1.4s ease-in-out infinite' }} />
        </div>
      </div>
      <style>{`
        @keyframes cp-spin { to { transform: rotate(360deg); } }
        @keyframes cp-slide { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
      `}</style>
    </main>
  );
};

export default Index;
