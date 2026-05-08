import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthShell } from '@/components/AuthShell';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) { setError(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => navigate('/', { replace: true }), 1200);
  };

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="Signing you in…">
        <div className="flex-1 flex flex-col items-center justify-center pt-8 animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-success" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you don't use elsewhere.">
      {!ready ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">New password</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" autoComplete="new-password"
                className="w-full h-14 px-4 pr-12 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Toggle password">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Confirm password</label>
            <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password" autoComplete="new-password"
              className="w-full h-14 px-4 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors" />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all disabled:opacity-60 shadow-[0_8px_24px_-6px_rgba(37,99,235,0.55)]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;