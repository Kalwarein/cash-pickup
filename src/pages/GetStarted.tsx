import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Shield, Zap, BarChart3, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: TrendingUp,
    title: 'Invest in Real Companies',
    description: 'Choose from top Sierra Leonean companies across Mining, Agriculture, Tech, and more. Your investment, your choice.',
    color: 'from-blue-600 to-sky-400',
  },
  {
    icon: BarChart3,
    title: 'Track CPR Daily',
    description: 'Company Performance Rate updates daily. Monitor trends, volatility, and insights to make informed decisions.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: Shield,
    title: 'Manage Your Risk',
    description: 'Use promo codes to reduce losses or boost gains. Every investment carries risk — invest wisely.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Zap,
    title: 'Claim Your Returns',
    description: 'When investments mature, claim your payout instantly. Start with 500 SLE welcome bonus!',
    color: 'from-sky-400 to-blue-700',
  },
];

const GetStarted = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      localStorage.setItem('cp_onboarded', 'true');
      navigate('/auth');
    }
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const skip = () => {
    localStorage.setItem('cp_onboarded', 'true');
    navigate('/auth');
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-6">
        <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon */}
        <div className={cn(
          "w-28 h-28 rounded-3xl bg-gradient-to-br flex items-center justify-center mb-10 shadow-2xl animate-scale-in",
          slide.color
        )}>
          <Icon className="w-14 h-14 text-white" />
        </div>

        {/* Text */}
        <h1 className="text-3xl font-bold text-foreground mb-4 animate-fade-in">{slide.title}</h1>
        <p className="text-muted-foreground text-base max-w-xs leading-relaxed animate-fade-in">{slide.description}</p>
      </div>

      {/* Navigation */}
      <div className="p-8 space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === current ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">
          {current > 0 && (
            <button
              onClick={prev}
              className="p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {current === slides.length - 1 ? 'Get Started' : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
