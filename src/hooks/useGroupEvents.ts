import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineAwareSupabase } from '@/lib/supabaseSafeWrapper';
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
      const result = await offlineAwareSupabase.query(
        supabase
          .from('group_events')
          .select('*')
          .eq('group_id', groupId)
          .order('name')
      );

      // Skip error toast if offline
      if (result.isOffline) {
        console.log('Offline: cannot fetch group events');
        setLoading(false);
        return;
      }

      if (result.error) throw result.error;
      setEvents(result.data || []);
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

    // Check offline before attempting create
    if (offlineAwareSupabase.isOffline()) {
      toast({
        title: "Offline",
        description: "Cannot create event while offline",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await offlineAwareSupabase.query(
        supabase
          .from('group_events')
          .insert({
            group_id: groupId,
            ...eventData,
          })
          .select()
          .single()
      );

      if (result.isOffline) {
        toast({
          title: "Offline",
          description: "Cannot create event while offline",
          variant: "destructive",
        });
        return;
      }

      if (result.error) throw result.error;

      setEvents(prev => [...prev, result.data]);
      toast({
        title: "Success",
        description: "Event type created successfully",
      });
      return result.data;
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

    // Check offline before attempting update
    if (offlineAwareSupabase.isOffline()) {
      toast({
        title: "Offline",
        description: "Cannot update event while offline",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await offlineAwareSupabase.query(
        supabase
          .from('group_events')
          .update(updates)
          .eq('id', eventId)
          .select()
          .single()
      );

      if (result.isOffline) {
        toast({
          title: "Offline",
          description: "Cannot update event while offline",
          variant: "destructive",
        });
        return;
      }

      if (result.error) throw result.error;

      setEvents(prev => prev.map(event => event.id === eventId ? result.data : event));
      toast({
        title: "Success",
        description: "Event type updated successfully",
      });
      return result.data;
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

    // Check offline before attempting delete
    if (offlineAwareSupabase.isOffline()) {
      toast({
        title: "Offline",
        description: "Cannot delete event while offline",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await offlineAwareSupabase.query(
        supabase
          .from('group_events')
          .delete()
          .eq('id', eventId)
      );

      if (result.isOffline) {
        toast({
          title: "Offline",
          description: "Cannot delete event while offline",
          variant: "destructive",
        });
        return;
      }

      if (result.error) throw result.error;

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
