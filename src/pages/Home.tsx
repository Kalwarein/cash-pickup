import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { HomeTab } from '@/components/tabs/HomeTab';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { NotificationPopups } from '@/components/NotificationPopups';
import { NotificationPermissionBanner } from '@/components/NotificationPermissionBanner';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { useCompanies } from '@/hooks/useCompanies';
import { useWallet } from '@/hooks/useWallet';
import { PageLoader } from '@/components/PageLoader';

const Home = () => {
  const { user, loading } = useAuth();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const { loading: companiesLoading } = useCompanies();
  const { loading: walletLoading } = useWallet();
  const navigate = useNavigate();
  useBackgroundSync();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && !onboardingLoading && user && completed === false) navigate('/onboarding');
  }, [user, loading, completed, onboardingLoading, navigate]);

  if (loading || onboardingLoading || companiesLoading || walletLoading) return <PageLoader />;

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
