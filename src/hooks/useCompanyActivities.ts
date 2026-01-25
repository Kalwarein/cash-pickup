import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyActivity {
  id: string;
  company_id: string;
  message: string;
  activity_type: string;
  created_at: string;
}

export const useCompanyActivities = (companyId: string | null) => {
  const [activities, setActivities] = useState<CompanyActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!companyId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('company_activities')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setActivities(data as CompanyActivity[]);
    }
    setLoading(false);
  }, [companyId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    fetchActivities();

    const channel = supabase
      .channel(`company_activities_${companyId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'company_activities',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newActivity = payload.new as CompanyActivity;
          setActivities(prev => [newActivity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [companyId, fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
};
