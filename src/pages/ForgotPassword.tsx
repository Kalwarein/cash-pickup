import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { z } from 'zod';

const schema = z.string().trim().email('Enter a valid email').max(255);

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = schema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await resetPassword(parsed.data);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a password reset link to ${email}.`}>
        <div className="flex-1 flex flex-col items-center justify-center text-center pt-8 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <MailCheck className="w-10 h-10 text-primary" />
          </div>
          <p className="text-muted-foreground max-w-xs">
            Tap the link in the email to set a new password. The link is valid for one hour.
          </p>
        </div>
        <button
          onClick={() => navigate('/sign-in')}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55)]"
        >
          Back to Sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Email</label>
          <input type="email" autoComplete="email" autoFocus value={email}
            onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full h-14 px-4 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors" />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all disabled:opacity-60 shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55)]">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send reset link <ArrowRight className="w-5 h-5" /></>}
        </button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;