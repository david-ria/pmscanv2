import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useGroupSettings } from '@/hooks/useGroupSettings';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_LOCATIONS, DEFAULT_ACTIVITIES } from '@/lib/locationsActivities';

export function useCustomListsForSubscription() {
  const { user } = useAuth();
  const { features } = useSubscription();
  const { isGroupMode, activeGroup } = useGroupSettings();
  
  const [customLocations, setCustomLocations] = useState<any[]>([]);
  const [customActivities, setCustomActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomLists = async () => {
      if (!features.hasCustomLists || !user?.id) {
        // For free users, use default hierarchical lists
        setCustomLocations(DEFAULT_LOCATIONS);
        setCustomActivities(DEFAULT_ACTIVITIES);
        setLoading(false);
        return;
      }

      try {
        if (isGroupMode && activeGroup?.id) {
          // Get group custom lists (expecting hierarchical structure)
          const { data: group } = await supabase
            .from('groups')
            .select('custom_locations')
            .eq('id', activeGroup.id)
            .single();
          
          const locations = Array.isArray(group?.custom_locations) ? group.custom_locations : DEFAULT_LOCATIONS;
          setCustomLocations(locations);
          // Flatten activities from locations
          setCustomActivities(locations.flatMap((loc: any) => loc.activities || []));
        } else {
          // Get user custom lists (expecting hierarchical structure)
          const { data: profile } = await supabase
            .from('profiles')
            .select('custom_locations')
            .eq('id', user.id)
            .single();
          
          const locations = Array.isArray(profile?.custom_locations) ? profile.custom_locations : DEFAULT_LOCATIONS;
          setCustomLocations(locations);
          // Flatten activities from locations
          setCustomActivities(locations.flatMap((loc: any) => loc.activities || []));
        }
      } catch (error) {
        console.error('Error fetching custom lists:', error);
        // Fallback to defaults on error
        setCustomLocations(DEFAULT_LOCATIONS);
        setCustomActivities(DEFAULT_ACTIVITIES);
      } finally {
        setLoading(false);
      }
    };

    loadCustomLists();
  }, [user?.id, features.hasCustomLists, isGroupMode, activeGroup?.id]);

  return {
    customLocations,
    customActivities,
    loading,
  };
}