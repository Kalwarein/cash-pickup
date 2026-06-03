import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    navigate('/', { replace: true });
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue investing.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email or Username</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full h-14 px-4 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-14 px-4 pr-12 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors"
            />
            <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">
              {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-semibold text-primary hover:underline">
            Forgot password?
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all disabled:opacity-60 shadow-float"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-muted-foreground">
        New here?{' '}
        <button onClick={() => navigate('/sign-up')} className="font-semibold text-primary hover:underline">
          Create an account
        </button>
      </p>
    </AuthShell>
  );
};

export default SignIn;