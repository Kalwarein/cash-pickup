import { Home, Layers3, Store, UserRound } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'home', path: '/home', label: 'Home', icon: Home },
  { id: 'market', path: '/market', label: 'Market', icon: Store },
  { id: 'cards', path: '/cards', label: 'Cards', icon: Layers3 },
  { id: 'profile', path: '/wallet', label: 'Profile', icon: UserRound },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = tabs.find((tab) => location.pathname.startsWith(tab.path))?.id;

  return (
    <nav className="bottom-nav z-40" aria-label="Main navigation">
      <div className="mx-auto flex max-w-xl items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.path)}
              aria-current={isActive ? 'page' : undefined}
              className={cn('nav-item relative flex-1', isActive && 'active')}
            >
              {isActive && <span className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />}
              <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} aria-hidden="true" />
              <span className={cn('mt-1 text-[10px] font-semibold transition-opacity duration-200', isActive ? 'opacity-100' : 'opacity-75')}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
