import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { InvestTab } from '@/components/tabs/InvestTab';
import { useAuth } from '@/contexts/AuthContext';

const Invest = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="max-w-lg mx-auto px-4 py-6">
        <InvestTab />
      </main>
      <BottomNav />
    </div>
  );
};

export default Invest;