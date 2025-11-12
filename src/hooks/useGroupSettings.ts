import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGroupConfig, type GroupConfig, type GroupThreshold, type GroupAlarm } from '@/lib/groupConfigs';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';
import { DEFAULT_THRESHOLDS } from '@/config/constants';
import { DEFAULT_LOCATIONS, DEFAULT_ACTIVITIES } from '@/lib/locationsActivities';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGroups, type Group } from '@/hooks/useGroups';
import { DEBUG_GROUP_SHAPE } from '@/config/debug';

// Set to track group IDs that have been warned about (to prevent spam)
const warnedGroupIds = new Set<string>();

// Type definitions for custom locations database formats
type CustomLocationsOldFormat = Record<string, string[]>;
type CustomLocationsNewFormat = Record<string, {
  name: string;
  description?: string;
  activities: string[];
}>;
type CustomLocationsDB = CustomLocationsOldFormat | CustomLocationsNewFormat;

// Helper function to create GroupConfig from DB Group
const createGroupConfigFromDB = (group: Group): GroupConfig => {
  return {
    id: group.id,
    name: group.name,
    description: group.description || undefined,
    logo_url: group.logo_url || undefined,
    thresholds: group.group_custom_thresholds && group.group_custom_thresholds.length > 0
      ? group.group_custom_thresholds.map(t => ({
          id: t.id,
          name: t.name,
          pm1_min: t.pm1_min ?? 0,
          pm1_max: t.pm1_max,
          pm25_min: t.pm25_min ?? 0,
          pm25_max: t.pm25_max,
          pm10_min: t.pm10_min ?? 0,
          pm10_max: t.pm10_max,
          color: t.color || '#3b82f6',
          enabled: t.enabled !== false,
        }))
      : [
          {
            name: 'Good',
            pm25_min: 0,
            pm25_max: DEFAULT_THRESHOLDS.pm25.good,
            pm10_min: 0,
            pm10_max: DEFAULT_THRESHOLDS.pm10.good,
            pm1_min: 0,
            pm1_max: DEFAULT_THRESHOLDS.pm1.good,
            color: '#22c55e',
            enabled: true,
          },
          {
            name: 'Moderate',
            pm25_min: DEFAULT_THRESHOLDS.pm25.good,
            pm25_max: DEFAULT_THRESHOLDS.pm25.moderate,
            pm10_min: DEFAULT_THRESHOLDS.pm10.good,
            pm10_max: DEFAULT_THRESHOLDS.pm10.moderate,
            pm1_min: DEFAULT_THRESHOLDS.pm1.good,
            pm1_max: DEFAULT_THRESHOLDS.pm1.moderate,
            color: '#eab308',
            enabled: true,
          },
          {
            name: 'Poor',
            pm25_min: DEFAULT_THRESHOLDS.pm25.moderate,
            pm25_max: DEFAULT_THRESHOLDS.pm25.poor,
            pm10_min: DEFAULT_THRESHOLDS.pm10.moderate,
            pm10_max: DEFAULT_THRESHOLDS.pm10.poor,
            pm1_min: DEFAULT_THRESHOLDS.pm1.moderate,
            pm1_max: DEFAULT_THRESHOLDS.pm1.poor,
            color: '#f97316',
            enabled: true,
          },
          {
            name: 'Very Poor',
            pm25_min: DEFAULT_THRESHOLDS.pm25.poor,
            pm10_min: DEFAULT_THRESHOLDS.pm10.poor,
            pm1_min: DEFAULT_THRESHOLDS.pm1.poor,
            color: '#ef4444',
            enabled: true,
          },
        ],
    alarms: group.group_settings?.[0]?.custom_alarms && Array.isArray(group.group_settings[0].custom_alarms) && group.group_settings[0].custom_alarms.length > 0
      ? group.group_settings[0].custom_alarms
      : [
          {
            name: 'Air Quality Alert',
            pm25_threshold: DEFAULT_THRESHOLDS.pm25.moderate,
            pm10_threshold: DEFAULT_THRESHOLDS.pm10.moderate,
            pm1_threshold: DEFAULT_THRESHOLDS.pm1.moderate,
            enabled: true,
            notification_frequency: 'immediate',
          },
        ],
    locations: group.custom_locations ? Object.entries(group.custom_locations).map(([key, value]) => {
      // Handle both old and new database formats
      let locationName: string;
      let locationDescription: string | undefined;
      let activitiesList: string[];

      if (Array.isArray(value)) {
        // Old format: Record<string, string[]>
        locationName = key; // Use key as name (fallback)
        locationDescription = undefined;
        activitiesList = value;
      } else if (typeof value === 'object' && value !== null) {
        // New format: Record<string, { name, description?, activities }>
        locationName = value.name || key; // ✅ Use value.name, fallback to key
        locationDescription = value.description;
        activitiesList = Array.isArray(value.activities) ? value.activities : [];
      } else {
        // Fallback for unexpected format
        locationName = key;
        locationDescription = undefined;
        activitiesList = [];
      }

      return {
        id: key, // Keep original key as ID for tracking
        name: locationName, // ✅ Use extracted name
        description: locationDescription,
        activities: activitiesList
          .filter((activity: string) => activity && activity.trim().length > 0)
          .map((activity: string) => ({
            id: activity.toLowerCase().replace(/\s+/g, '-'),
            name: activity,
          }))
      };
    }) : DEFAULT_LOCATIONS,
    events: group.group_events?.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      icon: e.icon || 'calendar',
      color: e.color || '#3b82f6',
      event_type: 'custom' as const,
      enabled: e.enabled !== false,
    })) || [],
    settings: {
      pm25_threshold: group.group_settings?.[0]?.pm25_threshold ?? DEFAULT_THRESHOLDS.pm25.moderate,
      pm10_threshold: group.group_settings?.[0]?.pm10_threshold ?? DEFAULT_THRESHOLDS.pm10.moderate,
      pm1_threshold: group.group_settings?.[0]?.pm1_threshold ?? DEFAULT_THRESHOLDS.pm1.moderate,
      alarm_enabled: group.group_settings?.[0]?.alarm_enabled ?? true,
      auto_share_stats: group.group_settings?.[0]?.auto_share_stats ?? true,
      notification_frequency: (group.group_settings?.[0]?.notification_frequency as 'immediate' | 'hourly' | 'daily') ?? 'immediate',
      location_auto_detect: group.group_settings?.[0]?.location_auto_detect ?? false,
      activity_auto_suggest: group.group_settings?.[0]?.activity_auto_suggest ?? false,
      event_notifications: group.group_settings?.[0]?.event_notifications ?? true,
      weekly_reports: group.group_settings?.[0]?.weekly_reports ?? false,
    },
  };
};

export const useGroupSettings = () => {
  const [searchParams] = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<GroupConfig | null>(() => {
    // 🔄 Hydrate from cache on init (offline-resilient)
    const cachedSettings = localStorage.getItem('groupSettings');
    if (cachedSettings) {
      try {
        const parsed = JSON.parse(cachedSettings);
        console.log('💾 [useGroupSettings] Hydrated from cache:', parsed.id);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isGroupMode, setIsGroupMode] = useState(() => {
    const storedGroupId = localStorage.getItem('activeGroupId');
    return !!storedGroupId;
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { features } = useSubscription();
  const { groups, loading } = useGroups();

  useEffect(() => {
    // Check for both 'group' parameter and direct group ID as parameter
    let groupId = searchParams.get('group');

    // If no 'group' parameter found, check if the first search param might be a group ID
    if (!groupId) {
      const firstParam = Array.from(searchParams.keys())[0];
      if (firstParam && firstParam.includes('research-lab')) {
        groupId = firstParam;
      }
    }

    logger.debug('Group ID from URL:', groupId);

    if (groupId) {
      // Try static config first
      let groupConfig = getGroupConfig(groupId);
      
      // If not found, try DB groups (only if we have data)
      if (!groupConfig && !loading) {
        const dbGroup = groups.find(g => g.id === groupId);
        if (dbGroup) {
          groupConfig = createGroupConfigFromDB(dbGroup);
        }
      }

      // 🌐 If offline or still loading, use cached config
      if (!groupConfig && !navigator.onLine) {
        const cachedSettings = localStorage.getItem('groupSettings');
        const cachedId = localStorage.getItem('activeGroupId');
        if (cachedSettings && cachedId === groupId) {
          try {
            groupConfig = JSON.parse(cachedSettings);
            console.log('🌐 [useGroupSettings] Using cached config (offline):', groupConfig?.name);
          } catch {
            // Cache corrupted, ignore
          }
        }
      }

      if (groupConfig) {
        setActiveGroup(groupConfig);
        setIsGroupMode(true);

        // Store group settings in localStorage for persistence
        localStorage.setItem('activeGroupId', groupId);
        localStorage.setItem('groupSettings', JSON.stringify(groupConfig));

        // Debug logging for group shape validation
        if (DEBUG_GROUP_SHAPE && process.env.NODE_ENV === 'development') {
          const dbGroup = groups.find(g => g.id === groupId);
          if (dbGroup) {
            console.log('🔍 Group locations processed:', {
              groupId: dbGroup.id,
              rawType: Array.isArray(dbGroup.custom_locations) ? 'Array' : 'Record',
              normalizedLocations: groupConfig.locations.length,
              example: groupConfig.locations[0] ? {
                id: groupConfig.locations[0].id,
                name: groupConfig.locations[0].name,
                activitiesCount: groupConfig.locations[0].activities?.length || 0
              } : null
            });
          }
        }

        toast({
          title: `Group Settings Applied`,
          description: `Now using settings for: ${groupConfig.name}`,
          duration: 3000,
        });
      } else {
        // 🆕 Cache fallback: Use localStorage if it matches the target group
        const cachedSettings = localStorage.getItem('groupSettings');
        const cachedId = localStorage.getItem('activeGroupId');
        if (cachedSettings && cachedId === groupId && navigator.onLine) {
          try {
            const cachedConfig = JSON.parse(cachedSettings);
            console.log('💾 [useGroupSettings] Using cache fallback for URL group:', cachedConfig.name);
            setActiveGroup(cachedConfig);
            setIsGroupMode(true);
            return; // Skip error toast
          } catch {
            // Cache corrupted, continue to error
          }
        }

        // 🆕 Suppress toast if activeGroup already matches this groupId (prevents flicker)
        if (activeGroup?.id === groupId) {
          console.log('🔇 [useGroupSettings] Suppressing duplicate "Group Not Found" toast for active group');
          return;
        }

        // Only warn about missing group after groups are loaded and if not already warned
        if (!loading && !warnedGroupIds.has(groupId)) {
          console.warn('Group not found:', groupId);
          warnedGroupIds.add(groupId);
          toast({
            title: 'Group Not Found',
            description: `Group "${groupId}" does not exist`,
            variant: 'destructive',
          });
        }
      }
    } else {
      // Check if we have a stored group
      const storedGroupId = localStorage.getItem('activeGroupId');
      logger.debug('Stored group ID:', storedGroupId);
      
      if (storedGroupId) {
        // Try static config first
        let groupConfig = getGroupConfig(storedGroupId);
        
        // If not found, try DB groups
        if (!groupConfig && !loading) {
          const dbGroup = groups.find(g => g.id === storedGroupId);
          if (dbGroup) {
            groupConfig = createGroupConfigFromDB(dbGroup);
          }
        }

        // 🌐 If offline or still loading, use cached config
        if (!groupConfig) {
          const cachedSettings = localStorage.getItem('groupSettings');
          if (cachedSettings) {
            try {
              groupConfig = JSON.parse(cachedSettings);
              console.log('🌐 [useGroupSettings] Using cached config (no URL):', groupConfig?.name);
            } catch {
              // Cache corrupted, ignore
            }
          }
        }
        
        if (groupConfig) {
          setActiveGroup(groupConfig);
          setIsGroupMode(true);
          
          // Re-add to URL for consistency
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('group', storedGroupId);
          window.history.replaceState({}, '', newUrl.toString());
        }
      }
    }
  }, [searchParams, toast, groups, loading]);

  const clearGroupSettings = () => {
    setActiveGroup(null);
    setIsGroupMode(false);
    localStorage.removeItem('activeGroupId');
    localStorage.removeItem('groupSettings');

    // Remove group parameter from URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('group');
    window.history.replaceState({}, '', newUrl.toString());

    toast({
      title: 'Group Settings Cleared',
      description: 'Returned to personal settings',
    });
  };

  const applyGroupById = async (groupId: string) => {
    // First try to get from static config
    let groupConfig = getGroupConfig(groupId);
    
    // If not found in static config, try to find in DB groups
    if (!groupConfig) {
      const dbGroup = groups.find(g => g.id === groupId);
      if (dbGroup) {
        groupConfig = createGroupConfigFromDB(dbGroup);
      }
    }

    // 🆕 Fallback: If still not found, try direct fetch from database
    if (!groupConfig && user) {
      console.log('🔍 [useGroupSettings] Group not in cache, fetching directly from DB...');
      try {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (groupError) throw groupError;

        // Fetch related data in parallel
        const [eventsRes, thresholdsRes, settingsRes] = await Promise.all([
          supabase.from('group_events').select('*').eq('group_id', groupId),
          supabase.from('group_custom_thresholds').select('*').eq('group_id', groupId),
          supabase.from('group_settings').select('*').eq('group_id', groupId),
        ]);

        // Construct full group object (cast to Group type for compatibility)
        const fullGroup = {
          ...groupData,
          group_events: eventsRes.data || [],
          group_custom_thresholds: thresholdsRes.data || [],
          group_settings: settingsRes.data || [],
        } as Group;

        groupConfig = createGroupConfigFromDB(fullGroup);
        console.log('✅ [useGroupSettings] Group fetched and normalized:', groupConfig.name);
      } catch (error) {
        console.error('❌ [useGroupSettings] Failed to fetch group from DB:', error);
        toast({
          title: 'Group Not Found',
          description: `Unable to load group "${groupId}"`,
          variant: 'destructive',
        });
        return false;
      }
    }

    if (groupConfig) {
      setActiveGroup(groupConfig);
      setIsGroupMode(true);

      localStorage.setItem('activeGroupId', groupId);
      localStorage.setItem('groupSettings', JSON.stringify(groupConfig));

      // Add group parameter to URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('group', groupId);
      window.history.replaceState({}, '', newUrl.toString());

      // Debug logs pour vérifier l'héritage
      logger.debug('🔄 Group switched:', {
        groupId,
        groupName: groupConfig.name,
        thresholds: groupConfig.thresholds.length,
        locations: groupConfig.locations.length,
        alarms: groupConfig.alarms.length,
        settings: groupConfig.settings,
      });

      toast({
        title: `Group Settings Applied`,
        description: `Now using settings for: ${groupConfig.name}`,
      });

      return true;
    } else {
      toast({
        title: 'Group Not Found',
        description: `Group "${groupId}" does not exist`,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Helper to get current thresholds (group or default)
  const getCurrentThresholds = (): GroupThreshold[] => {
    if (activeGroup) {
      return activeGroup.thresholds;
    }
    // Return default thresholds when not in group mode
    return [
      {
        name: 'Good',
        pm25_min: 0,
        pm25_max: DEFAULT_THRESHOLDS.pm25.good,
        pm10_min: 0,
        pm10_max: DEFAULT_THRESHOLDS.pm10.good,
        pm1_min: 0,
        pm1_max: DEFAULT_THRESHOLDS.pm1.good,
        color: '#22c55e',
        enabled: true,
      },
      {
        name: 'Moderate',
        pm25_min: DEFAULT_THRESHOLDS.pm25.good,
        pm25_max: DEFAULT_THRESHOLDS.pm25.moderate,
        pm10_min: DEFAULT_THRESHOLDS.pm10.good,
        pm10_max: DEFAULT_THRESHOLDS.pm10.moderate,
        pm1_min: DEFAULT_THRESHOLDS.pm1.good,
        pm1_max: DEFAULT_THRESHOLDS.pm1.moderate,
        color: '#eab308',
        enabled: true,
      },
      {
        name: 'Poor',
        pm25_min: DEFAULT_THRESHOLDS.pm25.moderate,
        pm25_max: DEFAULT_THRESHOLDS.pm25.poor,
        pm10_min: DEFAULT_THRESHOLDS.pm10.moderate,
        pm10_max: DEFAULT_THRESHOLDS.pm10.poor,
        pm1_min: DEFAULT_THRESHOLDS.pm1.moderate,
        pm1_max: DEFAULT_THRESHOLDS.pm1.poor,
        color: '#f97316',
        enabled: true,
      },
      {
        name: 'Very Poor',
        pm25_min: DEFAULT_THRESHOLDS.pm25.poor,
        pm10_min: DEFAULT_THRESHOLDS.pm10.poor,
        pm1_min: DEFAULT_THRESHOLDS.pm1.poor,
        color: '#ef4444',
        enabled: true,
      },
    ];
  };

  // Helper to get current settings (group or default)
  const getCurrentSettings = () => {
    if (activeGroup) {
      return activeGroup.settings;
    }
    // Return default settings when not in group mode
    return {
      pm25_threshold: DEFAULT_THRESHOLDS.pm25.moderate,
      pm10_threshold: DEFAULT_THRESHOLDS.pm10.moderate,
      pm1_threshold: DEFAULT_THRESHOLDS.pm1.moderate,
      alarm_enabled: true,
      auto_share_stats: false,
      notification_frequency: 'immediate' as const,
      location_auto_detect: false,
      activity_auto_suggest: false,
      event_notifications: true,
      weekly_reports: false,
    };
  };

  const getCurrentAlarms = (): GroupAlarm[] => {
    if (activeGroup) {
      return activeGroup.alarms;
    }
    // Return default alarm when not in group mode
    return [
      {
        name: 'Air Quality Alert',
        pm25_threshold: DEFAULT_THRESHOLDS.pm25.moderate,
        pm10_threshold: DEFAULT_THRESHOLDS.pm10.moderate,
        pm1_threshold: DEFAULT_THRESHOLDS.pm1.moderate,
        enabled: false, // Disabled by default for individual users
        notification_frequency: 'immediate',
      },
    ];
  };

  const getCurrentEvents = () => {
    if (activeGroup) {
      return activeGroup.events;
    }
    // Return empty array for events when not in group mode (no default events needed)
    return [];
  };

  const getCurrentLocations = () => {
    // Return full hierarchical structure
    if (activeGroup) {
      return activeGroup.locations;
    }
    // Return default locations with their activities
    return DEFAULT_LOCATIONS;
  };

  const getCurrentActivities = () => {
    // Flatten all activities from all locations
    const allActivities = activeGroup 
      ? activeGroup.locations.flatMap(loc => loc.activities)
      : DEFAULT_ACTIVITIES;
    
    // Deduplicate by id to prevent React key warnings
    const uniqueActivities = Array.from(
      new Map(allActivities.map(activity => [activity.id, activity])).values()
    );
    
    return uniqueActivities;
  };

  return {
    activeGroup,
    isGroupMode,
    clearGroupSettings,
    applyGroupById,
    getCurrentThresholds,
    getCurrentSettings,
    getCurrentAlarms,
    getCurrentLocations,
    getCurrentActivities,
    getCurrentEvents,
  };
};