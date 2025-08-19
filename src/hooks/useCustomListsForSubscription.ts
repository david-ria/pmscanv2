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
        // For free users, use default lists
        setCustomLocations(DEFAULT_LOCATIONS.map(loc => ({ 
          name: loc.name, 
          description: loc.description 
        })));
        setCustomActivities(DEFAULT_ACTIVITIES.map(activity => ({ 
          name: activity.name, 
          description: activity.description,
          icon: activity.icon 
        })));
        setLoading(false);
        return;
      }

      try {
        if (isGroupMode && activeGroup?.id) {
          // Get group custom lists
          const { data: group } = await supabase
            .from('groups')
            .select('custom_locations, custom_activities')
            .eq('id', activeGroup.id)
            .single();
          
          setCustomLocations(Array.isArray(group?.custom_locations) ? group.custom_locations : DEFAULT_LOCATIONS.map(loc => ({ 
            name: loc.name, 
            description: loc.description 
          })));
          setCustomActivities(Array.isArray(group?.custom_activities) ? group.custom_activities : DEFAULT_ACTIVITIES.map(activity => ({ 
            name: activity.name, 
            description: activity.description,
            icon: activity.icon 
          })));
        } else {
          // Get user custom lists
          const { data: profile } = await supabase
            .from('profiles')
            .select('custom_locations, custom_activities')
            .eq('id', user.id)
            .single();
          
          setCustomLocations(Array.isArray(profile?.custom_locations) ? profile.custom_locations : DEFAULT_LOCATIONS.map(loc => ({ 
            name: loc.name, 
            description: loc.description 
          })));
          setCustomActivities(Array.isArray(profile?.custom_activities) ? profile.custom_activities : DEFAULT_ACTIVITIES.map(activity => ({ 
            name: activity.name, 
            description: activity.description,
            icon: activity.icon 
          })));
        }
      } catch (error) {
        console.error('Error fetching custom lists:', error);
        // Fallback to defaults on error
        setCustomLocations(DEFAULT_LOCATIONS.map(loc => ({ 
          name: loc.name, 
          description: loc.description 
        })));
        setCustomActivities(DEFAULT_ACTIVITIES.map(activity => ({ 
          name: activity.name, 
          description: activity.description,
          icon: activity.icon 
        })));
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