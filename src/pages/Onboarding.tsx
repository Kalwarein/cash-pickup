import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, ChevronLeft, User, Briefcase, Target, Wallet, BarChart3, Bell, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const questions: Question[] = [
  { key: 'display_name', title: 'What should we call you?', subtitle: 'Enter your preferred display name', icon: User, type: 'text', placeholder: 'Your name' },
  { key: 'age_range', title: 'How old are you?', subtitle: 'This helps us personalize your experience', icon: User, type: 'single', options: ['18-24', '25-34', '35-44', '45-54', '55+'] },
  { key: 'occupation', title: 'What do you do?', subtitle: 'Tell us about your profession', icon: Briefcase, type: 'single', options: ['Student', 'Employed', 'Self-employed', 'Business Owner', 'Freelancer', 'Retired', 'Other'] },
  { key: 'income_source', title: 'Primary source of income?', subtitle: 'Helps us recommend investment amounts', icon: Wallet, type: 'single', options: ['Salary', 'Business', 'Freelancing', 'Investments', 'Family Support', 'Other'] },
  { key: 'investment_experience', title: 'Investment experience?', subtitle: 'How familiar are you with investing?', icon: BarChart3, type: 'single', options: ['Complete Beginner', 'Some Knowledge', 'Intermediate', 'Experienced', 'Expert'] },
  { key: 'financial_knowledge', title: 'Financial literacy level?', subtitle: 'How well do you understand financial concepts?', icon: BarChart3, type: 'single', options: ['Basic', 'Intermediate', 'Advanced', 'Professional'] },
  { key: 'risk_tolerance', title: 'Risk tolerance?', subtitle: 'How much risk are you comfortable with?', icon: Target, type: 'single', options: ['Very Conservative', 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'] },
  { key: 'investment_goal', title: 'What\'s your investment goal?', subtitle: 'What do you hope to achieve?', icon: Target, type: 'single', options: ['Save for Emergency', 'Grow Wealth', 'Passive Income', 'Short-term Profits', 'Long-term Security', 'Learn Investing'] },
  { key: 'investment_motivation', title: 'Why invest with Cash Pickup?', subtitle: 'What attracted you to our platform?', icon: Heart, type: 'single', options: ['Easy to Use', 'Low Minimum Investment', 'Sierra Leone Companies', 'USSD Payments', 'Friend Recommended', 'Want to Learn'] },
  { key: 'monthly_budget', title: 'Monthly investment budget?', subtitle: 'How much can you invest each month?', icon: Wallet, type: 'single', options: ['Under 500 SLE', '500 - 2,000 SLE', '2,000 - 10,000 SLE', '10,000 - 50,000 SLE', '50,000+ SLE'] },
  { key: 'preferred_sectors', title: 'Preferred sectors?', subtitle: 'Select the industries you\'re interested in (multiple)', icon: Briefcase, type: 'multi', options: SECTORS },
  { key: 'investment_timeline', title: 'Investment timeline?', subtitle: 'How long do you plan to invest?', icon: Target, type: 'single', options: ['1-4 Weeks', '1-3 Months', '3-6 Months', '6-12 Months', '1+ Years'] },
  { key: 'notification_preference', title: 'Notification preference?', subtitle: 'How would you like to be notified?', icon: Bell, type: 'single', options: ['All Notifications', 'Important Only', 'Investment Updates Only', 'Minimal', 'None'] },
  { key: 'referral_source', title: 'How did you find us?', subtitle: 'Help us grow our community', icon: Sparkles, type: 'single', options: ['Social Media', 'Friend/Family', 'Search Engine', 'News/Article', 'App Store', 'Other'] },
];

const Onboarding = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    display_name: '',
    age_range: '',
    occupation: '',
    investment_experience: '',
    risk_tolerance: '',
    investment_goal: '',
    monthly_budget: '',
    preferred_sectors: [],
    income_source: '',
    financial_knowledge: '',
    investment_timeline: '',
    notification_preference: '',
    referral_source: '',
    investment_motivation: '',
  });

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  // Load existing data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: ob } = await supabase
        .from('user_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (ob) {
        if (ob.completed) { navigate('/home'); return; }
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
      }
    };
    load();
  }, [user, navigate]);

  if (loading || !user) return null;

  const q = questions[step];
  const total = questions.length;
  const progress = ((step + 1) / total) * 100;

  const currentValue = q.type === 'multi' ? data[q.key] : data[q.key] as string;
  const canProceed = q.type === 'multi' ? (data[q.key] as string[]).length > 0 : (data[q.key] as string).length > 0;

  const handleSelect = (val: string) => {
    if (q.type === 'multi') {
      const arr = data[q.key] as string[];
      setData({ ...data, [q.key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] });
    } else {
      setData({ ...data, [q.key]: val });
    }
  };

  const handleNext = async () => {
    if (!canProceed) return;
    if (step < total - 1) {
      // Save progress
      await supabase.from('user_onboarding').update({
        [q.key]: data[q.key],
      }).eq('user_id', user.id);
      setStep(step + 1);
    } else {
      // Complete
      setSaving(true);
      const { error } = await supabase.from('user_onboarding').update({
        ...data,
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      // Update profile name
      if (data.display_name) {
        await supabase.from('profiles').update({ name: data.display_name }).eq('id', user.id);
      }

      setSaving(false);
      if (error) {
        toast.error('Failed to save. Please try again.');
      } else {
        toast.success('Welcome to Cash Pickup! 🎉');
        navigate('/home');
      }
    }
  };

  const Icon = q.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Step counter */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          className={cn("p-2 rounded-xl transition-colors", step > 0 ? "bg-muted hover:bg-muted/80" : "opacity-0 pointer-events-none")}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold text-muted-foreground">{step + 1} of {total}</span>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-4">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
          <Icon className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">{q.title}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{q.subtitle}</p>

        {/* Input */}
        <div className="flex-1 overflow-y-auto pb-4">
          {q.type === 'text' ? (
            <input
              type="text"
              value={data[q.key] as string}
              onChange={(e) => setData({ ...data, [q.key]: e.target.value })}
              placeholder={q.placeholder}
              className="w-full bg-input border border-border rounded-2xl px-5 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center"
              autoFocus
            />
          ) : (
            <div className={cn("grid gap-3", q.type === 'multi' ? "grid-cols-2" : "grid-cols-1")}>
              {q.options?.map((opt) => {
                const isSelected = q.type === 'multi'
                  ? (data[q.key] as string[]).includes(opt)
                  : data[q.key] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "px-4 py-3.5 rounded-2xl text-sm font-medium transition-all border text-left",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-border hover:border-primary/40"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-6 pb-8 pt-4">
        <button
          onClick={handleNext}
          disabled={!canProceed || saving}
          className={cn(
            "w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2",
            "bg-primary text-primary-foreground",
            (!canProceed || saving) && "opacity-50 cursor-not-allowed"
          )}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : step === total - 1 ? (
            'Complete Setup'
          ) : (
            <>Continue <ChevronRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
