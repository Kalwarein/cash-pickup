import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/dashboard');
      } else {
        // Check if user has seen onboarding
        const onboarded = localStorage.getItem('cp_onboarded');
        if (onboarded) {
          navigate('/auth');
        } else {
          navigate('/get-started');
        }
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center animate-pulse glow-primary">
          <span className="text-3xl font-bold text-primary-foreground">CP</span>
        </div>
        <h1 className="text-2xl font-bold text-gradient mb-2">Cash Pickup</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
