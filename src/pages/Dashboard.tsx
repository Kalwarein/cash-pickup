import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomeTab } from '@/components/tabs/HomeTab';
import { InvestTab } from '@/components/tabs/InvestTab';
import { MarketTab } from '@/components/tabs/MarketTab';
import { LeaderboardTab } from '@/components/tabs/LeaderboardTab';
import { WalletTab } from '@/components/tabs/WalletTab';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketEngine } from '@/hooks/useMarketEngine';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  // Keep the database-backed market + company charts moving in real time.
  // Rendering stays DB-driven via realtime subscriptions.
  useMarketEngine(Boolean(user));

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
      <main className="max-w-lg mx-auto px-4 py-6">
        {renderTab()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Dashboard;
