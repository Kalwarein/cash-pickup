import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronRight, ChevronLeft, User, Briefcase, Target,
  Wallet, BarChart3, Bell, Heart, Sparkles, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ── Types — UNTOUCHED ── */
interface OnboardingData {
  display_name: string;
  age_range: string;
  occupation: string;
  investment_experience: string;
  risk_tolerance: string;
  investment_goal: string;
  monthly_budget: string;
  preferred_sectors: string[];
  income_source: string;
  financial_knowledge: string;
  investment_timeline: string;
  notification_preference: string;
  referral_source: string;
  investment_motivation: string;
}

const SECTORS = ['Mining', 'Agriculture', 'Technology', 'Finance', 'Energy', 'Real Estate', 'Telecom', 'Tourism', 'Transport', 'Fisheries', 'Healthcare', 'Construction', 'Manufacturing', 'Education'];

interface Question {
  key: keyof OnboardingData;
  title: string;
  subtitle: string;
  icon: typeof User;
  type: 'text' | 'single' | 'multi';
  options?: string[];
  placeholder?: string;
}

/* ── Questions — UNTOUCHED ── */
const questions: Question[] = [
  { key: 'display_name', title: 'What should we call you?', subtitle: 'Enter your preferred display name', icon: User, type: 'text', placeholder: 'Your name' },
  { key: 'age_range', title: 'How old are you?', subtitle: 'This helps us personalise your experience', icon: User, type: 'single', options: ['18-24', '25-34', '35-44', '45-54', '55+'] },
  { key: 'occupation', title: 'What do you do?', subtitle: 'Tell us about your profession', icon: Briefcase, type: 'single', options: ['Student', 'Employed', 'Self-employed', 'Business Owner', 'Freelancer', 'Retired', 'Other'] },
  { key: 'income_source', title: 'Primary source of income?', subtitle: 'Helps us recommend investment amounts', icon: Wallet, type: 'single', options: ['Salary', 'Business', 'Freelancing', 'Investments', 'Family Support', 'Other'] },
  { key: 'investment_experience', title: 'Investment experience?', subtitle: 'How familiar are you with investing?', icon: BarChart3, type: 'single', options: ['Complete Beginner', 'Some Knowledge', 'Intermediate', 'Experienced', 'Expert'] },
  { key: 'financial_knowledge', title: 'Financial literacy level?', subtitle: 'How well do you understand financial concepts?', icon: BarChart3, type: 'single', options: ['Basic', 'Intermediate', 'Advanced', 'Professional'] },
  { key: 'risk_tolerance', title: 'Risk tolerance?', subtitle: 'How much risk are you comfortable with?', icon: Target, type: 'single', options: ['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'] },
  { key: 'investment_goal', title: "What's your investment goal?", subtitle: 'What do you hope to achieve?', icon: Target, type: 'single', options: ['Save for Emergency', 'Grow Wealth', 'Passive Income', 'Short-term Profits', 'Long-term Security', 'Learn Investing'] },
  { key: 'investment_motivation', title: 'Why invest with Cash Pickup?', subtitle: 'What attracted you to our platform?', icon: Heart, type: 'single', options: ['Easy to Use', 'Low Minimum Investment', 'Sierra Leone Companies', 'USSD Payments', 'Friend Recommended', 'Want to Learn'] },
  { key: 'monthly_budget', title: 'Monthly investment budget?', subtitle: 'How much can you invest each month?', icon: Wallet, type: 'single', options: ['Under 500 SLE', '500 - 2,000 SLE', '2,000 - 10,000 SLE', '10,000 - 50,000 SLE', '50,000+ SLE'] },
  { key: 'preferred_sectors', title: 'Preferred sectors?', subtitle: 'Pick the industries you\'re interested in', icon: Briefcase, type: 'multi', options: SECTORS },
  { key: 'investment_timeline', title: 'Investment timeline?', subtitle: 'How long do you plan to invest?', icon: Target, type: 'single', options: ['1-4 Weeks', '1-3 Months', '3-6 Months', '6-12 Months', '1+ Years'] },
  { key: 'notification_preference', title: 'Notification preference?', subtitle: 'How would you like to be notified?', icon: Bell, type: 'single', options: ['All Notifications', 'Important Only', 'Investment Updates Only', 'Minimal', 'None'] },
  { key: 'referral_source', title: 'How did you find us?', subtitle: 'Help us grow our community', icon: Sparkles, type: 'single', options: ['Social Media', 'Friend/Family', 'Search Engine', 'News/Article', 'App Store', 'Other'] },
];

/* ── Accent colours per step ── */
const STEP_COLORS = [
  { c: '#2563eb', bg: 'rgba(37,99,235,0.12)',  glow: 'rgba(37,99,235,0.28)'  },
  { c: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.28)' },
  { c: '#1d4ed8', bg: 'rgba(29,78,216,0.12)',  glow: 'rgba(29,78,216,0.28)'  },
  { c: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', glow: 'rgba(14,165,233,0.28)' },
  { c: '#2563eb', bg: 'rgba(37,99,235,0.12)',  glow: 'rgba(37,99,235,0.28)'  },
  { c: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.28)' },
  { c: '#1d4ed8', bg: 'rgba(29,78,216,0.12)',  glow: 'rgba(29,78,216,0.28)'  },
  { c: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', glow: 'rgba(14,165,233,0.28)' },
  { c: '#2563eb', bg: 'rgba(37,99,235,0.12)',  glow: 'rgba(37,99,235,0.28)'  },
  { c: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.28)' },
  { c: '#1d4ed8', bg: 'rgba(29,78,216,0.12)',  glow: 'rgba(29,78,216,0.28)'  },
  { c: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', glow: 'rgba(14,165,233,0.28)' },
  { c: '#2563eb', bg: 'rgba(37,99,235,0.12)',  glow: 'rgba(37,99,235,0.28)'  },
  { c: '#1d4ed8', bg: 'rgba(29,78,216,0.12)',  glow: 'rgba(29,78,216,0.28)'  },
];

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate            = useNavigate();
  const inputRef            = useRef<HTMLInputElement>(null);

  /* ── Original state — UNTOUCHED ── */
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [data, setData]       = useState<OnboardingData>({
    display_name: '', age_range: '', occupation: '',
    investment_experience: '', risk_tolerance: '', investment_goal: '',
    monthly_budget: '', preferred_sectors: [], income_source: '',
    financial_knowledge: '', investment_timeline: '',
    notification_preference: '', referral_source: '', investment_motivation: '',
  });

  /* ── New UI state ── */
  const [animDir, setAnimDir]   = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey]   = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  /* ── Auto-focus text input ── */
  useEffect(() => {
    if (questions[step].type === 'text') {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [step]);

  /* ── Original Supabase load — UNTOUCHED ── */
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: rows, error } = await supabase
        .from('user_onboarding').select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) { toast.error('Failed to load onboarding. Please try again.'); return; }

      if (rows && rows.length > 0) {
        if (rows.some(row => row.completed)) { navigate('/home', { replace: true }); return; }
        const ob = rows[0];
        setRecordId(ob.id);
        setData(prev => ({
          ...prev,
          display_name: ob.display_name || '',
          age_range: ob.age_range || '',
          occupation: ob.occupation || '',
          investment_experience: ob.investment_experience || '',
          risk_tolerance: ob.risk_tolerance || '',
          investment_goal: ob.investment_goal || '',
          monthly_budget: ob.monthly_budget || '',
          preferred_sectors: (ob.preferred_sectors as string[]) || [],
          income_source: ob.income_source || '',
          financial_knowledge: ob.financial_knowledge || '',
          investment_timeline: ob.investment_timeline || '',
          notification_preference: ob.notification_preference || '',
          referral_source: ob.referral_source || '',
          investment_motivation: ob.investment_motivation || '',
        }));
        return;
      }

      const { data: createdRow, error: createError } = await supabase
        .from('user_onboarding').insert({ user_id: user.id }).select('id').single();

      if (createError) { toast.error('Failed to start onboarding. Please refresh and try again.'); return; }
      setRecordId(createdRow.id);
    };
    load();
  }, [user, navigate]);

  if (loading || !user) return null;

  const q        = questions[step];
  const total    = questions.length;
  const progress = ((step + 1) / total) * 100;
  const color    = STEP_COLORS[step % STEP_COLORS.length];

  const canProceed = q.type === 'multi'
    ? (data[q.key] as string[]).length > 0
    : (data[q.key] as string).trim().length > 0;

  /* ── Original persist — UNTOUCHED ── */
  const persistOnboarding = async (updates: Partial<OnboardingData> & { completed?: boolean; completed_at?: string | null }) => {
    if (!user) return { error: new Error('No authenticated user found.') };

    if (recordId) {
      const { data: updatedRow, error } = await supabase
        .from('user_onboarding').update(updates).eq('id', recordId).select('id').maybeSingle();
      if (!error && updatedRow?.id) return { error: null };
    }

    const { data: insertedRow, error } = await supabase
      .from('user_onboarding').insert({ user_id: user.id, ...updates }).select('id').single();
    if (!error) setRecordId(insertedRow.id);
    return { error };
  };

  /* ── Original handleSelect — UNTOUCHED ── */
  const handleSelect = (val: string) => {
    if (q.type === 'multi') {
      const arr = data[q.key] as string[];
      setData({ ...data, [q.key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
    } else {
      setData({ ...data, [q.key]: val });
    }
  };

  /* ── Original handleNext — UNTOUCHED ── */
  const handleNext = async () => {
    if (!canProceed) return;
    setSaving(true);

    if (step < total - 1) {
      const { error } = await persistOnboarding({ [q.key]: data[q.key] } as Partial<OnboardingData>);
      setSaving(false);
      if (error) { toast.error('Failed to save this step. Please try again.'); return; }
      setAnimDir('forward');
      setAnimKey(k => k + 1);
      setStep(step + 1);
    } else {
      const { error } = await persistOnboarding({ ...data, completed: true, completed_at: new Date().toISOString() });
      if (data.display_name) {
        await supabase.from('profiles').update({ name: data.display_name }).eq('id', user.id);
      }
      setSaving(false);
      if (error) { toast.error('Failed to save. Please try again.'); }
      else { toast.success('Welcome to Cash Pickup! 🎉'); navigate('/home', { replace: true }); }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setAnimDir('back');
      setAnimKey(k => k + 1);
      setStep(step - 1);
    }
  };

  const Icon = q.icon;
  const isLast = step === total - 1;

  return (
    <div className="ob-root">
      {/* ── Background orbs ── */}
      <div className="ob-orb ob-orb--1" style={{ background: color.glow }} />
      <div className="ob-orb ob-orb--2" style={{ background: color.glow }} />

      {/* ── Top bar: back + progress + step counter ── */}
      <div className="ob-topbar">
        <button
          className={cn('ob-back-btn', step === 0 && 'ob-back-btn--hidden')}
          onClick={handleBack}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="ob-progress-track">
          <div
            className="ob-progress-fill"
            style={{ width: `${progress}%`, background: color.c, boxShadow: `0 0 8px ${color.glow}` }}
          />
          {/* Step dots */}
          <div className="ob-dots">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn('ob-dot', i <= step && 'ob-dot--done', i === step && 'ob-dot--active')}
                style={i <= step ? { background: color.c } : {}}
              />
            ))}
          </div>
        </div>

        <div className="ob-step-pill" style={{ background: color.bg, color: color.c }}>
          {step + 1}/{total}
        </div>
      </div>

      {/* ── Main content card ── */}
      <div
        key={animKey}
        className={cn('ob-card', animDir === 'forward' ? 'ob-card--enter-fwd' : 'ob-card--enter-back')}
      >
        {/* Icon glow */}
        <div className="ob-icon-wrap" style={{ background: color.bg, boxShadow: `0 8px 24px ${color.glow}` }}>
          <Icon className="ob-icon" style={{ color: color.c }} />
        </div>

        {/* Title */}
        <h1 className="ob-title">{q.title}</h1>
        <p className="ob-subtitle">{q.subtitle}</p>

        {/* ── Text input ── */}
        {q.type === 'text' && (
          <div className={cn('ob-input-wrap', inputFocused && 'ob-input-wrap--focused')}
            style={inputFocused ? { borderColor: color.c, boxShadow: `0 0 0 3px ${color.bg}` } : {}}>
            <Icon className="ob-input-icon" style={{ color: inputFocused ? color.c : undefined }} />
            <input
              ref={inputRef}
              type="text"
              value={data[q.key] as string}
              onChange={e => setData({ ...data, [q.key]: e.target.value })}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
              placeholder={q.placeholder}
              className="ob-input"
              autoComplete="off"
            />
            {(data[q.key] as string).trim().length > 0 && (
              <div className="ob-input-check" style={{ background: color.c }}>
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        )}

        {/* ── Single select ── */}
        {q.type === 'single' && (
          <div className="ob-options-single">
            {q.options?.map(opt => {
              const isOn = data[q.key] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={cn('ob-option-single', isOn && 'ob-option-single--on')}
                  style={isOn ? {
                    borderColor: color.c,
                    background: color.bg,
                    color: color.c,
                    boxShadow: `0 4px 16px ${color.glow}`,
                  } : {}}
                >
                  <span className="ob-option-text">{opt}</span>
                  <div className={cn('ob-option-radio', isOn && 'ob-option-radio--on')}
                    style={isOn ? { background: color.c, borderColor: color.c } : {}}>
                    {isOn && <div className="ob-option-radio-inner" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Multi select ── */}
        {q.type === 'multi' && (
          <>
            <p className="ob-multi-hint">
              {(data[q.key] as string[]).length === 0
                ? 'Tap to select one or more'
                : `${(data[q.key] as string[]).length} selected`
              }
            </p>
            <div className="ob-options-multi">
              {q.options?.map(opt => {
                const isOn = (data[q.key] as string[]).includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={cn('ob-option-multi', isOn && 'ob-option-multi--on')}
                    style={isOn ? {
                      borderColor: color.c,
                      background: color.bg,
                      color: color.c,
                    } : {}}
                  >
                    {isOn && <Check className="w-3 h-3 flex-shrink-0" style={{ color: color.c }} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="ob-footer">
        {/* Skip hint for non-last steps (optional feel) */}
        <button
          onClick={handleNext}
          disabled={!canProceed || saving}
          className="ob-cta"
          style={canProceed && !saving
            ? { background: color.c, boxShadow: `0 6px 24px ${color.glow}` }
            : {}
          }
        >
          {saving ? (
            <span className="ob-cta-loading">
              <span className="ob-spinner" />
              Saving...
            </span>
          ) : isLast ? (
            <>
              <Sparkles className="w-5 h-5" />
              Complete Setup
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* Micro-progress label */}
        <p className="ob-footer-hint">
          {total - step - 1 > 0
            ? `${total - step - 1} question${total - step - 1 === 1 ? '' : 's'} remaining`
            : 'Last step — almost done!'
          }
        </p>
      </div>

      <style>{`
        /* ── Root ── */
        .ob-root {
          min-height: 100svh;
          background: hsl(var(--background));
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          padding: env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0);
        }

        /* ── Orbs ── */
        .ob-orb {
          position: absolute; border-radius: 9999px;
          filter: blur(80px); pointer-events: none; z-index: 0;
          transition: background 0.6s ease;
        }
        .ob-orb--1 { width: 300px; height: 300px; top: -100px; right: -80px; opacity: 0.5; }
        .ob-orb--2 { width: 200px; height: 200px; bottom: 60px; left: -60px; opacity: 0.3; }

        /* ── Top bar ── */
        .ob-topbar {
          position: relative; z-index: 10;
          display: flex; align-items: center; gap: 10px;
          padding: 16px 18px 10px;
        }
        .ob-back-btn {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          border: 1.5px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: hsl(var(--foreground));
          transition: all 0.15s; -webkit-tap-highlight-color: transparent;
        }
        .ob-back-btn:active { transform: scale(0.88); }
        .ob-back-btn--hidden { opacity: 0; pointer-events: none; }

        /* Progress track */
        .ob-progress-track {
          flex: 1; height: 6px; border-radius: 9999px;
          background: hsl(var(--muted)); position: relative; overflow: visible;
        }
        .ob-progress-fill {
          height: 100%; border-radius: 9999px;
          transition: width 0.5s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease;
          position: relative; z-index: 1;
        }
        .ob-dots {
          position: absolute; top: 50%; left: 0; right: 0;
          display: flex; justify-content: space-between;
          transform: translateY(-50%); pointer-events: none;
        }
        .ob-dot {
          width: 6px; height: 6px; border-radius: 9999px;
          background: hsl(var(--muted)); transition: all 0.3s ease;
        }
        .ob-dot--done  { transform: scale(1); }
        .ob-dot--active { transform: scale(1.6); box-shadow: 0 0 6px currentColor; }

        /* Step pill */
        .ob-step-pill {
          flex-shrink: 0; padding: 4px 10px; border-radius: 9999px;
          font-size: 11px; font-weight: 800; transition: all 0.3s ease;
        }

        /* ── Card ── */
        .ob-card {
          flex: 1; position: relative; z-index: 5;
          display: flex; flex-direction: column;
          padding: 16px 20px 8px; overflow-y: auto;
        }
        .ob-card--enter-fwd {
          animation: obSlideFwd 0.32s cubic-bezier(0.34,1.2,0.64,1) both;
        }
        .ob-card--enter-back {
          animation: obSlideBack 0.32s cubic-bezier(0.34,1.2,0.64,1) both;
        }
        @keyframes obSlideFwd {
          from { opacity: 0; transform: translateX(40px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)  scale(1);    }
        }
        @keyframes obSlideBack {
          from { opacity: 0; transform: translateX(-40px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)   scale(1);    }
        }

        /* Icon */
        .ob-icon-wrap {
          width: 72px; height: 72px; border-radius: 22px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          transition: background 0.4s ease, box-shadow 0.4s ease;
        }
        .ob-icon { width: 34px; height: 34px; transition: color 0.4s ease; }

        .ob-title {
          font-size: 26px; font-weight: 900; color: hsl(var(--foreground));
          text-align: center; line-height: 1.2; letter-spacing: -0.4px;
          margin-bottom: 8px;
        }
        .ob-subtitle {
          font-size: 14px; color: hsl(var(--muted-foreground));
          text-align: center; line-height: 1.5; margin-bottom: 28px;
        }

        /* ── Text input ── */
        .ob-input-wrap {
          display: flex; align-items: center; gap: 12px;
          padding: 0 16px; height: 58px; border-radius: 18px;
          border: 2px solid hsl(var(--border)); background: hsl(var(--card));
          transition: all 0.2s ease; margin-bottom: 12px;
        }
        .ob-input-wrap--focused { }
        .ob-input-icon { width: 18px; height: 18px; flex-shrink: 0; color: hsl(var(--muted-foreground)); transition: color 0.2s; }
        .ob-input {
          flex: 1; background: none; border: none; outline: none;
          font-size: 16px; font-weight: 600; color: hsl(var(--foreground));
          min-width: 0;
        }
        .ob-input::placeholder { color: hsl(var(--muted-foreground)); font-weight: 400; }
        .ob-input-check {
          width: 22px; height: 22px; border-radius: 9999px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          animation: obCheckPop 0.2s cubic-bezier(0.34,1.4,0.64,1);
        }
        @keyframes obCheckPop { from { transform: scale(0); } to { transform: scale(1); } }

        /* ── Single select ── */
        .ob-options-single {
          display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px;
        }
        .ob-option-single {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-radius: 18px;
          border: 2px solid hsl(var(--border)); background: hsl(var(--card));
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: all 0.18s ease; text-align: left;
        }
        .ob-option-single:active { transform: scale(0.98); }
        .ob-option-text { font-size: 15px; font-weight: 600; color: hsl(var(--foreground)); }
        .ob-option-single--on .ob-option-text { font-weight: 700; }
        .ob-option-radio {
          width: 22px; height: 22px; border-radius: 9999px; flex-shrink: 0;
          border: 2px solid hsl(var(--border)); background: hsl(var(--card));
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .ob-option-radio--on { }
        .ob-option-radio-inner {
          width: 8px; height: 8px; border-radius: 9999px; background: white;
          animation: obCheckPop 0.18s ease;
        }

        /* ── Multi select ── */
        .ob-multi-hint {
          font-size: 12px; font-weight: 700; color: hsl(var(--muted-foreground));
          text-align: center; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .ob-options-multi {
          display: flex; flex-wrap: wrap; gap: 9px; padding-bottom: 8px;
          justify-content: center;
        }
        .ob-option-multi {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 9px 16px; border-radius: 9999px;
          border: 2px solid hsl(var(--border)); background: hsl(var(--card));
          font-size: 13px; font-weight: 600; color: hsl(var(--foreground));
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: all 0.18s ease;
        }
        .ob-option-multi:active { transform: scale(0.94); }
        .ob-option-multi--on { font-weight: 700; }

        /* ── Footer ── */
        .ob-footer {
          position: relative; z-index: 10;
          padding: 12px 20px 24px; display: flex; flex-direction: column; gap: 10px;
        }
        .ob-cta {
          width: 100%; height: 56px; border-radius: 18px; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 16px; font-weight: 800; color: white;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
          transition: all 0.25s ease;
          background: hsl(var(--muted)); color: hsl(var(--muted-foreground));
        }
        .ob-cta:disabled { cursor: not-allowed; opacity: 0.55; }
        .ob-cta:not(:disabled):active { transform: scale(0.97); }
        .ob-cta-loading { display: flex; align-items: center; gap: 8px; }
        .ob-spinner {
          width: 18px; height: 18px; border-radius: 9999px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: obSpin 0.65s linear infinite;
        }
        @keyframes obSpin { to { transform: rotate(360deg); } }

        .ob-footer-hint {
          text-align: center; font-size: 12px; color: hsl(var(--muted-foreground)); font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
