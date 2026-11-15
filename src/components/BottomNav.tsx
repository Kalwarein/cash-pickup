import { Home, TrendingUp, BarChart3, Pickaxe, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'home', path: '/home', label: 'Home', icon: Home },
  { id: 'invest', path: '/invest', label: 'Invest', icon: TrendingUp },
  { id: 'market', path: '/market', label: 'Market', icon: BarChart3 },
  { id: 'earn', path: '/earn', label: 'Earn', icon: Pickaxe },
  { id: 'wallet', path: '/wallet', label: 'Wallet', icon: Wallet },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.id;

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "nav-item flex-1",
                isActive && "active"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 transition-all duration-200",
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-200",
                isActive ? "opacity-100" : "opacity-70"
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};