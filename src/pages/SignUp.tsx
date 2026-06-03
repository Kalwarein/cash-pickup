import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell } from '@/components/AuthShell';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface FormState {
  first_name: string;
  last_name: string;
  username: string;
  phone: string;
  date_of_birth: string;
  email: string;
  password: string;
  confirm: string;
}

const initial: FormState = {
  first_name: '', last_name: '', username: '',
  phone: '', date_of_birth: '',
  email: '', password: '', confirm: '',
};

const today = new Date();
const minDob = new Date(today.getFullYear() - 100, 0, 1).toISOString().slice(0, 10);
const maxDob = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

const stepSchemas = [
  z.object({
    first_name: z.string().trim().min(2, 'First name must be at least 2 characters').max(50),
    last_name: z.string().trim().min(2, 'Last name must be at least 2 characters').max(50),
  }),
  z.object({
    username: z.string().trim().min(3, 'Username must be at least 3 characters').max(20)
      .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only'),
  }),
  z.object({
    phone: z.string().trim().regex(/^\+?\d{7,15}$/, 'Enter a valid phone number'),
  }),
  z.object({
    date_of_birth: z.string().min(1, 'Date of birth required')
      .refine(v => v >= minDob && v <= maxDob, 'You must be 13 or older'),
  }),
  z.object({
    email: z.string().trim().email('Enter a valid email').max(255),
  }),
  z.object({
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirm: z.string(),
  }).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' }),
];

const stepMeta = [
  { title: "What's your name?", subtitle: 'We use this to personalise your account.' },
  { title: 'Pick a username', subtitle: 'This is how others will find you.' },
  { title: 'Your phone number', subtitle: 'Used for security and important account alerts.' },
  { title: 'Your date of birth', subtitle: 'You must be 13 or older to use Cash Pickup.' },
  { title: 'Your email address', subtitle: "We'll send important updates here." },
  { title: 'Create a password', subtitle: 'Use 8+ characters with a mix of letters and numbers.' },
];

const TOTAL = stepMeta.length;

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setError(''); setTimeout(() => firstFieldRef.current?.focus(), 250); }, [step]);

  const update = (k: keyof FormState, v: string) => setData(prev => ({ ...prev, [k]: v }));

  const validateCurrent = () => {
    const result = stepSchemas[step].safeParse(data as never);
    if (!result.success) { setError(result.error.errors[0].message); return false; }
    setError(''); return true;
  };

  const handleNext = async () => {
    if (!validateCurrent()) return;
    if (step < TOTAL - 1) { setStep(s => s + 1); return; }

    setLoading(true);
    const { error } = await signUp(data.email, data.password, {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      username: data.username.trim(),
      phone: data.phone.trim(),
      date_of_birth: data.date_of_birth,
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes('already registered')
        ? 'This email is already registered. Please sign in.'
        : error.message);
      return;
    }
    navigate('/', { replace: true });
  };

  const handleBack = () => {
    if (step === 0) navigate('/auth');
    else setStep(s => s - 1);
  };

  const meta = stepMeta[step];

  return (
    <AuthShell
      onBack={handleBack}
      progress={(step + 1) / TOTAL}
      title={meta.title}
      subtitle={meta.subtitle}
    >
      <div key={step} className="animate-fade-in flex-1 flex flex-col">
        <form
          onSubmit={(e) => { e.preventDefault(); handleNext(); }}
          className="space-y-4"
        >
          {step === 0 && (
            <>
              <Field label="First name">
                <input ref={firstFieldRef} value={data.first_name} onChange={e => update('first_name', e.target.value)}
                  placeholder="Aminata" autoComplete="given-name" className={inputCls} />
              </Field>
              <Field label="Last name">
                <input value={data.last_name} onChange={e => update('last_name', e.target.value)}
                  placeholder="Kamara" autoComplete="family-name" className={inputCls} />
              </Field>
            </>
          )}

          {step === 1 && (
            <Field label="Username">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">@</span>
                <input ref={firstFieldRef} value={data.username}
                  onChange={e => update('username', e.target.value.replace(/\s+/g, ''))}
                  placeholder="aminata_k" autoComplete="username"
                  className={cn(inputCls, 'pl-9')} />
              </div>
            </Field>
          )}

          {step === 2 && (
            <Field label="Phone number">
              <input ref={firstFieldRef} value={data.phone} onChange={e => update('phone', e.target.value)}
                placeholder="+232 76 123 456" inputMode="tel" autoComplete="tel" className={inputCls} />
            </Field>
          )}

          {step === 3 && (
            <Field label="Date of birth">
              <input ref={firstFieldRef} type="date" value={data.date_of_birth}
                onChange={e => update('date_of_birth', e.target.value)}
                min={minDob} max={maxDob} className={inputCls} />
            </Field>
          )}

          {step === 4 && (
            <Field label="Email">
              <input ref={firstFieldRef} type="email" value={data.email}
                onChange={e => update('email', e.target.value)}
                placeholder="you@example.com" autoComplete="email" className={inputCls} />
            </Field>
          )}

          {step === 5 && (
            <>
              <Field label="Password">
                <div className="relative">
                  <input ref={firstFieldRef} type={showPwd ? 'text' : 'password'} value={data.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="At least 8 characters" autoComplete="new-password"
                    className={cn(inputCls, 'pr-12')} />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label="Toggle password visibility">
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm password">
                <input type={showPwd ? 'text' : 'password'} value={data.confirm}
                  onChange={e => update('confirm', e.target.value)}
                  placeholder="Re-enter your password" autoComplete="new-password" className={inputCls} />
              </Field>
              <PwdHints value={data.password} />
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-2xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="mt-auto pt-8 space-y-3">
          <button
            onClick={handleNext}
            disabled={loading}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] hover:brightness-110 transition-all disabled:opacity-60 shadow-float"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              step === TOTAL - 1 ? <>Create account <ArrowRight className="w-5 h-5" /></> : <>Continue <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
          <p className="text-center text-xs text-muted-foreground">Step {step + 1} of {TOTAL}</p>
        </div>
      </div>
    </AuthShell>
  );
};

const inputCls = "w-full h-14 px-4 rounded-2xl bg-card border-2 border-border focus:border-primary focus:outline-none text-foreground font-medium transition-colors";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
    {children}
  </div>
);

const PwdHints = ({ value }: { value: string }) => {
  const checks = [
    { ok: value.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(value), label: 'A letter' },
    { ok: /\d/.test(value), label: 'A number' },
  ];
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {checks.map(c => (
        <div key={c.label}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
            c.ok ? "bg-success/10 border-success/30 text-success" : "bg-muted border-border text-muted-foreground"
          )}>
          <Check className="w-3 h-3" /> {c.label}
        </div>
      ))}
    </div>
  );
};

export default SignUp;