import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GroupAlarm {
  id: string;
  name: string;
  pollutant: 'pm1' | 'pm25' | 'pm10';
  threshold: number;
  enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  color: string;
}

export function useGroupAlarms(groupId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alarms, setAlarms] = useState<GroupAlarm[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlarms = useCallback(async () => {
    if (!groupId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_settings')
        .select('custom_alarms')
        .eq('group_id', groupId)
        .single();

      if (error) throw error;
      setAlarms((data?.custom_alarms as GroupAlarm[]) || []);
    } catch (error) {
      console.error('Error fetching group alarms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch group alarms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, user, toast]);

  const saveAlarms = useCallback(async (newAlarms: GroupAlarm[]) => {
    if (!groupId || !user) return;

    try {
      const { error } = await supabase
        .from('group_settings')
        .update({ custom_alarms: newAlarms as any })
        .eq('group_id', groupId);

      if (error) throw error;

      setAlarms(newAlarms);
      toast({
        title: "Success",
        description: "Alarms updated successfully",
      });
    } catch (error) {
      console.error('Error saving alarms:', error);
      toast({
        title: "Error",
        description: "Failed to save alarms",
        variant: "destructive",
      });
    }
  }, [groupId, user, toast]);

  const createAlarm = useCallback(async (alarmData: Omit<GroupAlarm, 'id'>) => {
    const newAlarm = {
      ...alarmData,
      id: crypto.randomUUID(),
    };
    
    const newAlarms = [...alarms, newAlarm];
    await saveAlarms(newAlarms);
  }, [alarms, saveAlarms]);

  const updateAlarm = useCallback(async (alarmId: string, updates: Partial<Omit<GroupAlarm, 'id'>>) => {
    const newAlarms = alarms.map(alarm => 
      alarm.id === alarmId ? { ...alarm, ...updates } : alarm
    );
    await saveAlarms(newAlarms);
  }, [alarms, saveAlarms]);

  const deleteAlarm = useCallback(async (alarmId: string) => {
    const newAlarms = alarms.filter(alarm => alarm.id !== alarmId);
    await saveAlarms(newAlarms);
  }, [alarms, saveAlarms]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  return {
    alarms,
    loading,
    createAlarm,
    updateAlarm,
    deleteAlarm,
    refetch: fetchAlarms,
  };
}