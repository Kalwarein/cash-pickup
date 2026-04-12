import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomeTab } from '@/components/tabs/HomeTab';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { NotificationPopups } from '@/components/NotificationPopups';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

const Home = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();
  useBackgroundSync();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && !onboardingLoading && user && completed === false) navigate('/onboarding');
  }, [user, loading, completed, onboardingLoading, navigate]);

  if (loading || onboardingLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center animate-pulse">
          <span className="text-2xl font-bold text-primary-foreground">CP</span>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <NotificationPermissionBanner />
      <main className="max-w-lg mx-auto">
        <HomeTab />
      </main>
      <NotificationPopups />
      <BottomNav />
    </div>
  );
};

export default Home;
