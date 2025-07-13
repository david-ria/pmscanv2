import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGroupConfig, type GroupConfig } from '@/lib/groupConfigs';
import { useToast } from '@/hooks/use-toast';
import * as logger from '@/utils/logger';

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
    
    logger.debug('Group ID from URL:', groupId);
    
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
          duration: 3000
        });
      } else {
        console.error('Group not found:', groupId); // Debug log
        toast({
          title: "Group Not Found",
          description: `Group "${groupId}" does not exist`,
          variant: "destructive"
        });
      }
    } else {
      // Check if we have a stored group
      const storedGroupId = localStorage.getItem('activeGroupId');
      logger.debug('Stored group ID:', storedGroupId);
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
      title: "Group Settings Cleared",
      description: "Returned to personal settings",
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
        title: "Group Not Found",
        description: `Group "${groupId}" does not exist`,
        variant: "destructive"
      });
      return false;
    }
  };

  // Helper to get current thresholds (group or default)
  const getCurrentThresholds = () => {
    if (activeGroup) {
      return activeGroup.thresholds;
    }
    // Return empty array if no group - components should handle their own defaults
    return [];
  };

  // Helper to get current settings (group or default)
  const getCurrentSettings = () => {
    if (activeGroup) {
      return activeGroup.settings;
    }
    // Return null if no group - components should handle their own defaults
    return null;
  };

  const getCurrentAlarms = () => {
    if (activeGroup) {
      return activeGroup.alarms;
    }
    return [];
  };

  const getCurrentLocations = () => {
    if (activeGroup) {
      return activeGroup.locations;
    }
    return [];
  };

  const getCurrentActivities = () => {
    if (activeGroup) {
      return activeGroup.activities;
    }
    return [];
  };

  const getCurrentEvents = () => {
    if (activeGroup) {
      return activeGroup.events;
    }
    return [];
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
    getCurrentEvents
  };
};