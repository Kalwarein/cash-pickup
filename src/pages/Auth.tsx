import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.07-1.1-.16-1.6H12z"/>
  </svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M16.4 1.5c0 1.1-.4 2.1-1.2 3-.8.9-1.8 1.5-2.8 1.4-.1-1.1.4-2.1 1.2-3 .8-.9 2-1.5 2.8-1.4zM20 17.5c-.5 1.1-.8 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.7 3.1-1.4 0-1.7-.9-3.6-.9-1.9 0-2.3.9-3.6.9-1.6 0-2.8-1.6-3.7-2.9C3.1 17.5 2.4 13.6 4 11c1.1-1.7 2.9-2.7 4.6-2.7 1.7 0 2.7 1 4.1 1 1.3 0 2.1-1 4.1-1 1.5 0 3.1.8 4.2 2.2-3.7 2-3.1 7.3-1 7z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(`Could not sign in with ${provider}.`);
        setOauthLoading(null);
        return;
      }
      if (result.redirected) return; // browser redirects
      navigate('/');
    } catch {
      toast.error('Something went wrong. Please try again.');
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 flex flex-col">
      {/* Background orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-80 h-80 rounded-full bg-sky-300/30 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-blue-400/30 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-8 pt-16">
        <div className="relative w-24 h-24 mb-6 animate-fade-in">
          <div className="absolute inset-0 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-center animate-float">
            <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow">CP</span>
          </div>
          <div className="absolute inset-0 rounded-3xl ring-2 ring-white/40 animate-pulse-glow" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow animate-fade-in">Welcome to Cash Pickup</h1>
        <p className="mt-3 text-white/85 text-base max-w-xs leading-relaxed animate-fade-in">
          Invest in real Sierra Leonean companies. Smart, simple, secure.
        </p>
      </div>

      {/* Action sheet */}
      <div className="relative z-10 bg-background rounded-t-[32px] px-6 pt-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] animate-slide-up">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/25 mb-6" />

        <div className="space-y-3">
          <button
            onClick={() => handleOAuth('google')}
            disabled={!!oauthLoading}
            className="w-full h-14 rounded-2xl bg-card border border-border flex items-center justify-center gap-3 font-semibold text-foreground active:scale-[0.98] transition-all hover:bg-muted/50 disabled:opacity-60"
          >
            {oauthLoading === 'google' ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth('apple')}
            disabled={!!oauthLoading}
            className="w-full h-14 rounded-2xl bg-foreground text-background flex items-center justify-center gap-3 font-semibold active:scale-[0.98] transition-all hover:opacity-90 disabled:opacity-60"
          >
            {oauthLoading === 'apple' ? <Loader2 className="w-5 h-5 animate-spin" /> : <AppleIcon />}
            Continue with Apple
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wider">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={() => navigate('/sign-up')}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white flex items-center justify-center gap-2 font-semibold active:scale-[0.98] transition-all hover:brightness-110 shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55)]"
          >
            <Mail className="w-5 h-5" />
            Sign up with Email
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/sign-in')}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </button>
        </p>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/80 leading-relaxed">
          By continuing you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;