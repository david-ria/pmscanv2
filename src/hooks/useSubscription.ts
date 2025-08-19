import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGroups } from '@/hooks/useGroups';
import { useUserRole } from '@/hooks/useUserRole';

export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

interface SubscriptionFeatures {
  canUseLocationEnrichment: boolean;
  canUseWeatherData: boolean;
  canUseAutoContext: boolean;
  hasCustomLists: boolean;
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
    maxMeasurementsPerDay: 100,
    maxGroupsAllowed: 1,
  },
  premium: {
    canUseLocationEnrichment: true,
    canUseWeatherData: true,
    canUseAutoContext: true,
    hasCustomLists: true,
    maxMeasurementsPerDay: 1000,
    maxGroupsAllowed: 5,
  },
  enterprise: {
    canUseLocationEnrichment: true,
    canUseWeatherData: true,
    canUseAutoContext: true,
    hasCustomLists: true,
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

    try {
      setError(null);
      
      // Get user's direct subscription tier
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, continue with free tier
        if (profileError.code === 'PGRST116') {
          setUserTier('free');
          setLoading(false);
          return;
        }
        
        console.error('Error fetching user subscription:', profileError);
        setError('Failed to fetch subscription data');
        setUserTier('free');
        setLoading(false);
        return;
      }

      let highestTier = (profile?.subscription_tier as SubscriptionTier) || 'free';

      // Check group subscriptions only if groups loaded successfully and exist
      if (userGroups && userGroups.length > 0 && !groupsError) {
        const groupIds = userGroups.map(group => group.id);
        
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('subscription_tier')
          .in('id', groupIds);

        if (!groupsError && groups) {
          const tierPriority = { enterprise: 3, premium: 2, free: 1 };
          const groupTiers = groups.map(g => g.subscription_tier as SubscriptionTier);
          
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
  }, [user?.id, userGroups, groupsLoading, groupsError]);

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