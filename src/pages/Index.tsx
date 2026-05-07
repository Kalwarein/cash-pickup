import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';

const Index = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || onboardingLoading) return;

    if (user) {
      if (completed === false) {
        navigate('/onboarding');
      } else {
        navigate('/home');
      }
    } else {
      const onboarded = localStorage.getItem('cp_onboarded');
      if (onboarded) {
        navigate('/auth');
      } else {
        navigate('/get-started');
      }
    }
  }, [user, loading, completed, onboardingLoading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full bg-blue-400/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />

      <div className="relative text-center animate-fade-in">
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl animate-float flex items-center justify-center">
            <span className="text-4xl font-extrabold text-white tracking-tight drop-shadow-lg">CP</span>
          </div>
          <div className="absolute inset-0 rounded-3xl ring-2 ring-white/40 animate-pulse-glow" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Cash Pickup</h1>
        <p className="mt-2 text-sm text-white/80">Invest in Sierra Leone</p>
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/90 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default Index;
