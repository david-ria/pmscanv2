import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGroupConfig, type GroupConfig, type GroupThreshold, type GroupAlarm } from '@/lib/groupConfigs';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';
import { DEFAULT_THRESHOLDS } from '@/config/constants';
import { DEFAULT_LOCATIONS, DEFAULT_ACTIVITIES } from '@/lib/locationsActivities';

export const useGroupSettings = () => {
  const [searchParams] = useSearchParams();
  const [activeGroup, setActiveGroup] = useState<GroupConfig | null>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const { toast } = useToast();

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

    // logger.debug('Group ID from URL:', groupId); // Disabled to prevent console spam

    if (groupId) {
      const groupConfig = getGroupConfig(groupId);
      logger.debug('Group config found:', groupConfig);

      if (groupConfig) {
        setActiveGroup(groupConfig);
        setIsGroupMode(true);

        // Store group settings in localStorage for persistence
        localStorage.setItem('activeGroupId', groupId);
        localStorage.setItem('groupSettings', JSON.stringify(groupConfig));

        toast({
          title: `Group Settings Applied`,
          description: `Now using settings for: ${groupConfig.name}`,
          duration: 3000,
        });
      } else {
        console.error('Group not found:', groupId); // Debug log
        toast({
          title: 'Group Not Found',
          description: `Group "${groupId}" does not exist`,
          variant: 'destructive',
        });
      }
    } else {
      // Check if we have a stored group
      const storedGroupId = localStorage.getItem('activeGroupId');
      // logger.debug('Stored group ID:', storedGroupId); // Disabled to prevent console spam
      if (storedGroupId) {
        const groupConfig = getGroupConfig(storedGroupId);
        if (groupConfig) {
          setActiveGroup(groupConfig);
          setIsGroupMode(true);
        }
      }
    }
  }, [searchParams, toast]);

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

  const applyGroupById = (groupId: string) => {
    const groupConfig = getGroupConfig(groupId);

    if (groupConfig) {
      setActiveGroup(groupConfig);
      setIsGroupMode(true);

      localStorage.setItem('activeGroupId', groupId);
      localStorage.setItem('groupSettings', JSON.stringify(groupConfig));

      // Add group parameter to URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('group', groupId);
      window.history.replaceState({}, '', newUrl.toString());

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
    if (activeGroup) {
      return activeGroup.locations;
    }
    // Return default locations when not in group mode
    return DEFAULT_LOCATIONS.map((loc) => ({ 
      name: loc.name, 
      description: loc.description 
    }));
  };

  const getCurrentActivities = () => {
    if (activeGroup) {
      return activeGroup.activities;
    }
    // Return default activities when not in group mode
    return DEFAULT_ACTIVITIES.map((activity) => ({ 
      name: activity.name, 
      description: activity.description,
      icon: activity.icon 
    }));
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