import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { z } from 'zod';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

const SignIn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setLoading(false);
    if (error) {
      setError(error.message.includes('Invalid login credentials') ? 'Invalid email or password' : error.message);
      return;
    }
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? '/market', { replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to collect and trade fictional cards.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email or Username</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-14 w-full rounded-2xl border-2 border-border bg-card px-4 font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="h-14 w-full rounded-2xl border-2 border-border bg-card px-4 pr-12 font-medium text-foreground transition-colors focus:border-primary focus:outline-none"
            />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
              {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-semibold text-primary hover:underline">Forgot password?</button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="gradient-primary flex h-14 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-primary-foreground shadow-float transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-5 w-5" /></>}
        </button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        New here?{' '}
        <button type="button" onClick={() => navigate('/sign-up')} className="font-semibold text-primary hover:underline">Create an account</button>
      </p>
    </AuthShell>
  );
};

export default SignIn;
