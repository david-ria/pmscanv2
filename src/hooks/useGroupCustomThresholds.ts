import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GroupCustomThreshold {
  id: string;
  group_id: string;
  name: string;
  pm1_min?: number;
  pm1_max?: number;
  pm25_min?: number;
  pm25_max?: number;
  pm10_min?: number;
  pm10_max?: number;
  color: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useGroupCustomThresholds = (groupId: string) => {
  const [thresholds, setThresholds] = useState<GroupCustomThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchThresholds = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from('group_custom_thresholds')
        .select('*')
        .eq('group_id', groupId)
        .order('name');

      if (error) throw error;
      setThresholds(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch group thresholds',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createThreshold = async (
    threshold: Omit<GroupCustomThreshold, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { error } = await supabase
        .from('group_custom_thresholds')
        .insert(threshold);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group threshold created successfully',
      });

      await fetchThresholds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create group threshold',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateThreshold = async (
    id: string,
    updates: Partial<GroupCustomThreshold>
  ) => {
    try {
      const { error } = await supabase
        .from('group_custom_thresholds')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group threshold updated successfully',
      });

      await fetchThresholds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group threshold',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteThreshold = async (id: string) => {
    try {
      const { error } = await supabase
        .from('group_custom_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Group threshold deleted successfully',
      });

      await fetchThresholds();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete group threshold',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchThresholds();
  }, [groupId]);

  return {
    thresholds,
    loading,
    createThreshold,
    updateThreshold,
    deleteThreshold,
    refetch: fetchThresholds,
  };
};
