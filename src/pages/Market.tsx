import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { MarketTab } from '@/components/tabs/MarketTab';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { PageLoader } from '@/components/PageLoader';

const Market = () => {
  const { user, loading } = useAuth();
  const { loading: companiesLoading } = useCompanies();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user || companiesLoading)
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="flex min-h-[calc(100svh-5rem)] items-center justify-center">
          <PageLoader inline />
        </div>
        <BottomNav />
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6">
        <MarketTab />
      </main>
      <BottomNav />
    </div>
  );
};

export default Market;