import { useState } from 'react';
import { useGroups } from '@/hooks/useGroups';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AdvancedGroupData {
  // Basic info
  name: string;
  description?: string;
  
  // Subscription tier
  subscription_tier: 'free' | 'premium';
  
  // Settings
  settings: {
    pm1_threshold: number;
    pm25_threshold: number;
    pm10_threshold: number;
    alarm_enabled: boolean;
    auto_share_stats: boolean;
    notification_frequency: 'immediate' | 'hourly' | 'daily';
    location_auto_detect: boolean;
    activity_auto_suggest: boolean;
    event_notifications: boolean;
    weekly_reports: boolean;
    default_location?: string;
    default_activity?: string;
  };
  
  // Custom thresholds
  thresholds: Array<{
    name: string;
    pm1_min?: number;
    pm1_max?: number;
    pm25_min?: number;
    pm25_max?: number;
    pm10_min?: number;
    pm10_max?: number;
    color: string;
    enabled: boolean;
  }>;
  
  // Custom locations with linked activities (stored in groups table as jsonb)
  custom_locations: Array<{
    name: string;
    description?: string;
    activities: Array<{
      name: string;
      description?: string;
      icon?: string;
    }>;
  }>;
}

export const useAdvancedGroupCreation = () => {
  const { createGroup } = useGroups();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAdvancedGroup = async (data: AdvancedGroupData) => {
    setIsSubmitting(true);
    
    try {
      // 1. Create the basic group first
      const group = await createGroup(data.name, data.description);
      
      if (!group?.id) {
        throw new Error('Failed to create group');
      }

      // 2. Update group with subscription tier and custom data
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          subscription_tier: data.subscription_tier,
          custom_locations: data.custom_locations,
          custom_activities: null, // Not used anymore - activities are now linked to locations
        })
        .eq('id', group.id);

      if (updateError) throw updateError;

      // 3. Create group settings (this should be automatic via trigger, but ensure it exists)
      const { error: settingsError } = await supabase
        .from('group_settings')
        .upsert({
          group_id: group.id,
          ...data.settings,
        }, {
          onConflict: 'group_id'
        });

      if (settingsError) throw settingsError;

      // 4. Create custom thresholds
      if (data.thresholds.length > 0) {
        const thresholdsToInsert = data.thresholds.map(threshold => ({
          group_id: group.id,
          ...threshold,
        }));

        const { error: thresholdsError } = await supabase
          .from('group_custom_thresholds')
          .insert(thresholdsToInsert);

        if (thresholdsError) throw thresholdsError;
      }

      toast({
        title: 'Success',
        description: `Advanced group "${data.name}" created successfully with all configurations`,
      });

      return group;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create advanced group',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createAdvancedGroup,
    isSubmitting,
  };
};