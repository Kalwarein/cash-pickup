import cosmic from '@/assets/cards/cosmic.jpg';
import fox from '@/assets/cards/fox.jpg';
import titanium from '@/assets/cards/titanium.jpg';

const artwork: Record<string, string> = { cosmic, fox, titanium };

export function CardArtwork({ artworkKey, name, eager = false }: { artworkKey: string; name: string; eager?: boolean }) {
  return <img src={artwork[artworkKey] ?? cosmic} alt={`${name} collection artwork`} width={768} height={1024} loading={eager ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105" />;
}