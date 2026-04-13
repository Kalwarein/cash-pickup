import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompleted(null);
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('completed, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        setCompleted(false);
        setLoading(false);
        return;
      }

      const hasCompletedOnboarding = data?.some((row) => row.completed) ?? false;
      setCompleted(hasCompletedOnboarding);
      setLoading(false);
    };

    check();
  }, [user]);

  return { completed, loading };
};
