import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import authInvestImage from '@/assets/auth-invest.jpg';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const validateForm = () => {
    try {
      emailSchema.parse(formData.email);
      passwordSchema.parse(formData.password);
      if (!isLogin) {
        nameSchema.parse(formData.name);
      }
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else {
            setError(error.message);
          }
        } else {
          navigate('/');
        }
      } else {
        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered. Please sign in.');
          } else {
            setError(error.message);
          }
        } else {
          navigate('/');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Visual side */}
        <div className="relative hidden lg:block">
          <img
            src={authInvestImage}
            alt="Investment trading workspace"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-background/30" />
          <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/40 to-transparent" />
          <div className="relative z-10 h-full p-10 flex flex-col justify-between">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <TrendingUp className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">Cash Pickup</div>
                <div className="text-xs text-muted-foreground">Invest • Grow • Prosper</div>
              </div>
            </div>
            <div className="max-w-md">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Risk-based investing with real outcomes.
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Invest in companies, track performance rates, and earn returns based on daily CPR. All investments carry risk.
              </p>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="relative flex items-center justify-center p-6 lg:p-10">
          {/* Mobile top brand */}
          <div className="absolute left-6 top-6 lg:hidden">
            <div className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Cash Pickup</div>
                <div className="text-[11px] text-muted-foreground">Investment platform</div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm">
            {/* Tab Toggle */}
            <div className="flex bg-muted/70 p-1 rounded-2xl mb-6 border border-border">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  !isLogin ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Sign Up
              </button>
            </div>

            <div className="rounded-3xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-sm">
              <div className="mb-5">
                <h1 className="text-2xl font-bold text-foreground">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isLogin ? 'Sign in to continue investing.' : 'Create your account and start investing today.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your name"
                      className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter your password"
                      className="w-full bg-input border border-border rounded-2xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full py-4 rounded-2xl font-semibold text-base transition-all",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90 active:scale-[0.98]",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Deposit & withdraw via <span className="text-primary font-semibold">Monime USSD</span> — Orange Money & Afrimoney supported.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              © {new Date().getFullYear()} Cash Pickup
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
