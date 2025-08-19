import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GroupEvent {
  id: string;
  group_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useGroupEvents(groupId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!groupId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('group_events')
        .select('*')
        .eq('group_id', groupId)
        .order('name');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching group events:', error);
      toast({
        title: "Error",
        description: "Failed to fetch group events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, user, toast]);

  const createEvent = useCallback(async (eventData: Omit<GroupEvent, 'id' | 'created_at' | 'updated_at' | 'group_id'>) => {
    if (!groupId || !user) return;

    try {
      const { data, error } = await supabase
        .from('group_events')
        .insert({
          group_id: groupId,
          ...eventData,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Event type created successfully",
      });
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event type",
        variant: "destructive",
      });
    }
  }, [groupId, user, toast]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Omit<GroupEvent, 'id' | 'group_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('group_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => prev.map(event => event.id === eventId ? data : event));
      toast({
        title: "Success",
        description: "Event type updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event type",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event type deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error", 
        description: "Failed to delete event type",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
}