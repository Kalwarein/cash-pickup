import { BadgeCheck, Building2, Cpu, Layers3, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CardCatalogRow } from '@/integrations/supabase/card-trading-types';
import { cn } from '@/lib/utils';

const palettes = [
  { base: '#10233d', glow: '#23b8b0', foil: '#72f2d5' },
  { base: '#35133f', glow: '#ff62a7', foil: '#ffa3c8' },
  { base: '#1d2147', glow: '#8885ff', foil: '#b9b5ff' },
  { base: '#512a0b', glow: '#ffb23e', foil: '#ffdf93' },
  { base: '#102c31', glow: '#46d5ee', foil: '#a3f2ff' },
  { base: '#3e1c1e', glow: '#ff765a', foil: '#ffb39f' },
];

const categoryNames: Record<CardCatalogRow['category'], string> = {
  meme: 'MEME SERIES',
  company: 'COMPANY SERIES',
  fintech_collectible: 'FINTECH SERIES',
  community: 'COMMUNITY SERIES',
};

const categoryIcons = {
  meme: Sparkles,
  company: Building2,
  fintech_collectible: Cpu,
  community: Layers3,
} satisfies Record<CardCatalogRow['category'], typeof Sparkles>;

const paletteFor = (code: string) => {
  const score = [...code].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palettes[score % palettes.length];
};

export const CardArtwork = ({
  card,
  className,
  compact = false,
}: {
  card: Pick<CardCatalogRow, 'code' | 'title' | 'category'>;
  className?: string;
  compact?: boolean;
}) => {
  const palette = paletteFor(card.code);
  const Icon = categoryIcons[card.category];
  const style = {
    '--card-base': palette.base,
    '--card-glow': palette.glow,
    '--card-foil': palette.foil,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'card-foil relative isolate overflow-hidden rounded-[1.15rem] border border-white/15 text-white shadow-lg transition-transform duration-300',
        compact ? 'aspect-[1.58]' : 'aspect-[1.72]',
        className,
      )}
      style={style}
      aria-label={`${card.title} fictional collectible card`}
    >
      <div className="card-foil__grid absolute inset-0 opacity-40" />
      <div className="absolute -right-8 -top-14 h-40 w-40 rounded-full border border-white/20" />
      <div className="absolute -right-2 -top-8 h-28 w-28 rounded-full border border-white/15" />
      <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[8px] font-black tracking-[0.16em] text-white/75 sm:text-[9px]">
              {categoryNames[card.category]}
            </span>
          </div>
          <BadgeCheck className="h-4 w-4 shrink-0 text-white/75" aria-label="Fictional collectible" />
        </div>
        <div className="max-w-[85%]">
          <p className="line-clamp-2 font-display text-base font-extrabold leading-tight tracking-tight drop-shadow sm:text-lg">
            {card.title}
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-white/65 sm:text-[10px]">
            {card.code} <span className="mx-1 text-white/35">/</span> COLLECTIBLE
          </p>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-[8px] font-semibold tracking-[0.18em] text-white/50">CASH PICKUP · DIGITAL SERIES</span>
          <span className="h-1.5 w-10 rounded-full bg-white/80 shadow-[0_0_16px_var(--card-foil)]" />
        </div>
      </div>
    </div>
  );
};
