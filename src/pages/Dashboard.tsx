import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomeTab } from '@/components/tabs/HomeTab';
import { InvestTab } from '@/components/tabs/InvestTab';
import { MarketTab } from '@/components/tabs/MarketTab';
import { LeaderboardTab } from '@/components/tabs/LeaderboardTab';
import { WalletTab } from '@/components/tabs/WalletTab';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationPopups } from '@/components/NotificationPopups';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { useInvestments } from '@/hooks/useInvestments';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { sle } from '@/lib/currency';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const { maturedInvestments } = useInvestments();
  const { permission, sendNotification } = usePushNotifications();
  const prevMaturedCount = useRef(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Send push notification when new investments mature
  useEffect(() => {
    if (permission !== 'granted' || !maturedInvestments) return;
    const count = maturedInvestments.length;
    if (count > prevMaturedCount.current && prevMaturedCount.current >= 0) {
      const diff = count - prevMaturedCount.current;
      if (diff > 0 && prevMaturedCount.current > 0) {
        const totalValue = maturedInvestments
          .slice(0, diff)
          .reduce((s, inv) => s + (inv.final_value || 0), 0);
        sendNotification('Investment Matured! 🎉', {
          body: `${diff} investment${diff > 1 ? 's' : ''} ready to claim — ${sle(totalValue)} total. Tap to claim now.`,
          tag: 'investment-matured',
        });
      }
    }
    prevMaturedCount.current = count;
  }, [maturedInvestments, permission, sendNotification]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-primary-foreground">CP</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'invest':
        return <InvestTab />;
      case 'market':
        return <MarketTab />;
      case 'leaderboard':
        return <LeaderboardTab />;
      case 'wallet':
        return <WalletTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <NotificationPermissionBanner />
      <main className="max-w-lg mx-auto px-4 py-6">
        {renderTab()}
      </main>
      <NotificationPopups />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
