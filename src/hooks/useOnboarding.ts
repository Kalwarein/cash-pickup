import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useOnboarding = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const check = async () => {
      const { data } = await supabase
        .from('user_onboarding')
        .select('completed')
        .eq('user_id', user.id)
        .single();

      setCompleted(data?.completed ?? false);
      setLoading(false);
    };
    check();
  }, [user]);

  return { completed, loading };
};
