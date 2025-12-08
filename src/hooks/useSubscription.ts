import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { offlineAwareSupabase } from '@/lib/supabaseSafeWrapper';
import { useGroups } from '@/hooks/useGroups';
import { useUserRole } from '@/hooks/useUserRole';

export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

interface SubscriptionFeatures {
  canUseLocationEnrichment: boolean;
  canUseWeatherData: boolean;
  canUseAutoContext: boolean;
  hasCustomLists: boolean;
  customAlarms: boolean;
  customEvents: boolean;
  maxMeasurementsPerDay?: number;
  maxGroupsAllowed?: number;
}

interface SubscriptionData {
  tier: SubscriptionTier;
  features: SubscriptionFeatures;
  loading: boolean;
  error: string | null;
}

const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  free: {
    canUseLocationEnrichment: false,
    canUseWeatherData: false,
    canUseAutoContext: false,
    hasCustomLists: false,
    customAlarms: false,
    customEvents: false,
    maxMeasurementsPerDay: 100,
    maxGroupsAllowed: 1,
  },
  premium: {
    canUseLocationEnrichment: true,
    canUseWeatherData: true,
    canUseAutoContext: true,
    hasCustomLists: true,
    customAlarms: true,
    customEvents: true,
    maxMeasurementsPerDay: 1000,
    maxGroupsAllowed: 5,
  },
  enterprise: {
    canUseLocationEnrichment: true,
    canUseWeatherData: true,
    canUseAutoContext: true,
    hasCustomLists: true,
    customAlarms: true,
    customEvents: true,
    // No limits for enterprise
  },
};

export function useSubscription(): SubscriptionData {
  const { user } = useAuth();
  const { groups: userGroups, loading: groupsLoading, error: groupsError } = useGroups();
  const { isSuperAdmin } = useUserRole();
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize group IDs to prevent unnecessary re-computations
  const groupIds = useMemo(() => {
    return userGroups?.map(group => group.id) || [];
  }, [userGroups]);

  const fetchUserSubscription = useCallback(async () => {
    if (!user?.id) {
      setUserTier('free');
      setLoading(false);
      return;
    }

    // Wait for groups to finish loading
    if (groupsLoading) {
      return;
    }

    // Check offline status - fallback to free tier silently
    if (offlineAwareSupabase.isOffline()) {
      console.log('Offline: using default subscription tier');
      setUserTier('free');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Get user's direct subscription tier
      const profileResult = await offlineAwareSupabase.query(
        supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
      );

      if (profileResult.isOffline) {
        console.log('Offline: using default subscription tier');
        setUserTier('free');
        setLoading(false);
        return;
      }

      if (profileResult.error) {
        // If profile doesn't exist (PGRST116), continue with free tier
        const errorStr = typeof profileResult.error === 'string' 
          ? profileResult.error 
          : JSON.stringify(profileResult.error);
        
        if (errorStr.includes('PGRST116')) {
          setUserTier('free');
          setLoading(false);
          return;
        }
        
        console.error('Error fetching user subscription:', profileResult.error);
        setError('Failed to fetch subscription data');
        setUserTier('free');
        setLoading(false);
        return;
      }

      let highestTier = (profileResult.data?.subscription_tier as SubscriptionTier) || 'free';

      // Check group subscriptions only if groups loaded successfully and exist
      if (groupIds.length > 0 && !groupsError) {
        const groupsResult = await offlineAwareSupabase.query(
          supabase
            .from('groups')
            .select('subscription_tier')
            .in('id', groupIds)
        );

        if (!groupsResult.isOffline && !groupsResult.error && groupsResult.data) {
          const tierPriority = { enterprise: 3, premium: 2, free: 1 };
          const groupTiers = groupsResult.data.map(g => g.subscription_tier as SubscriptionTier);
          
          for (const tier of groupTiers) {
            if (tierPriority[tier] > tierPriority[highestTier]) {
              highestTier = tier;
            }
          }
        }
      }

      setUserTier(highestTier);
    } catch (err) {
      console.error('Unexpected error fetching subscription:', err);
      setError('Unexpected error occurred');
      setUserTier('free');
    } finally {
      setLoading(false);
    }
  }, [user?.id, groupIds, groupsLoading, groupsError]);

  useEffect(() => {
    fetchUserSubscription();
  }, [fetchUserSubscription]);

  // Super admin override - grant enterprise features
  const finalFeatures = isSuperAdmin 
    ? TIER_FEATURES.enterprise 
    : TIER_FEATURES[userTier];

  return {
    tier: userTier,
    features: finalFeatures,
    loading,
    error,
  };
}
