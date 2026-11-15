import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeftRight, BadgeCheck, ChevronLeft, ChevronRight, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  {
    icon: Layers3,
    eyebrow: 'A digital collection',
    title: 'Discover 30 fictional cards',
    description: 'Explore meme, company, fintech, and community collectibles. Each card has its own generated collectible code and belongs to your private collection.',
    color: 'from-blue-600 to-sky-400',
  },
  {
    icon: Activity,
    eyebrow: 'Quotes that move',
    title: 'Follow the live market',
    description: 'Card quotes fluctuate up and down as the simulated market updates. Past movement is not a prediction and profit is never guaranteed.',
    color: 'from-sky-500 to-blue-600',
  },
  {
    icon: Sparkles,
    eyebrow: 'A one-time welcome',
    title: 'Get Le 15 in simulation credits',
    description: 'On your first sign-in, the backend awards Le 15 once for card trading. These promotional credits are fictional, have no cash value, and cannot be withdrawn or redeemed.',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: ArrowLeftRight,
    eyebrow: 'Collect · buy · sell',
    title: 'Trade cards, not payment cards',
    description: 'Buy a collectible, keep its unique serial in your Cards page, or sell it at the server’s quote when you choose. This app does not ask for real card numbers or CVVs.',
    color: 'from-sky-400 to-blue-700',
  },
];

const GetStarted = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  const finish = () => {
    localStorage.setItem('cp_onboarded', 'true');
    navigate('/auth');
  };

  const next = () => {
    if (current < slides.length - 1) {
      setDir('forward');
      setAnimKey((key) => key + 1);
      setCurrent((step) => step + 1);
    } else finish();
  };

  const prev = () => {
    if (current > 0) {
      setDir('back');
      setAnimKey((key) => key + 1);
      setCurrent((step) => step - 1);
    }
  };

  const skip = () => {
    localStorage.setItem('cp_onboarded', 'true');
    navigate('/auth');
  };

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-[100svh] flex-col bg-background">
      <div className="flex justify-end p-6">
        <button type="button" onClick={skip} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Skip</button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div key={animKey} className={cn('flex flex-col items-center', dir === 'forward' ? 'gs-enter-fwd' : 'gs-enter-back')}>
          <div className={cn('mb-8 flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br shadow-2xl ring-1 ring-white/20', slide.color)} style={{ boxShadow: '0 20px 50px -12px rgba(37,99,235,0.45)' }}>
            <Icon className="h-14 w-14 text-white drop-shadow" />
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary">{slide.eyebrow}</span>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-foreground">{slide.title}</h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-muted-foreground">{slide.description}</p>
          {current === 2 && <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-success"><ShieldCheck className="h-4 w-4" /> One-time backend-controlled bonus</p>}
          {current === 3 && <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><BadgeCheck className="h-4 w-4 text-primary" /> Fictional collectibles only · no real payment data</p>}
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex justify-center gap-2" role="group" aria-label="Introduction slides">
          {slides.map((item, index) => (
            <button key={item.eyebrow} type="button" aria-label={`Go to slide ${index + 1}`} aria-current={index === current ? 'step' : undefined} onClick={() => { setDir(index > current ? 'forward' : 'back'); setAnimKey((key) => key + 1); setCurrent(index); }} className={cn('h-2 rounded-full transition-all', index === current ? 'w-8 bg-gradient-to-r from-blue-600 to-sky-400 shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 'w-2 bg-muted-foreground/30')} />
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          {current > 0 && <button type="button" onClick={prev} aria-label="Previous slide" className="rounded-2xl bg-muted p-4 transition-colors hover:bg-muted/80"><ChevronLeft className="h-5 w-5" /></button>}
          <button type="button" onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-lg font-semibold text-primary-foreground shadow-float transition-all hover:brightness-110 active:scale-[0.98]">
            {current === slides.length - 1 ? 'Explore the market' : 'Continue'} <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gsFwd { from { opacity: 0; transform: translateX(32px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes gsBack { from { opacity: 0; transform: translateX(-32px) scale(.97); } to { opacity: 1; transform: translateX(0) scale(1); } }
        .gs-enter-fwd { animation: gsFwd .35s cubic-bezier(.34,1.2,.64,1) both; }
        .gs-enter-back { animation: gsBack .35s cubic-bezier(.34,1.2,.64,1) both; }
      `}</style>
    </div>
  );
};

export default GetStarted;
