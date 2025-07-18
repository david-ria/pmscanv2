import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface EventData {
  id?: string;
  mission_id: string;
  event_type: string;
  comment?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  created_by?: string;
  timestamp?: string;
}

export function useEvents() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const createEvent = async (eventData: Omit<EventData, 'id' | 'created_by'>) => {
    setIsLoading(true);
    try {
      if (!user) {
        console.error('No user found when trying to create event');
        throw new Error('User must be logged in to create events');
      }

      console.log('Creating event with user:', user.id);
      console.log('Event data:', eventData);

      // Store the event locally first, since the mission doesn't exist in DB yet
      const localEvent = {
        id: crypto.randomUUID(),
        ...eventData,
        created_by: user.id,
        timestamp: eventData.timestamp || new Date().toISOString(),
      };

      // Store in localStorage to associate with mission when it's saved
      const existingEvents = JSON.parse(localStorage.getItem('pending_events') || '[]');
      existingEvents.push(localEvent);
      localStorage.setItem('pending_events', JSON.stringify(existingEvents));

      console.log('Event stored locally:', localEvent);
      
      toast({
        title: 'Event Recorded',
        description: 'Event has been recorded and will be saved with the mission.',
      });
      
      return localEvent;
    } catch (error) {
      console.error('Error creating event - full error:', error);
      toast({
        title: 'Error',
        description: `Failed to save event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadEventPhoto = async (file: File, userId: string): Promise<string> => {
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
      .from('event-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('event-photos')
      .getPublicUrl(data.path);

    return publicUrl;
  };

  const getEventsByMission = useCallback(async (missionId: string) => {
    setIsLoading(true);
    try {
      // First try to get from database
      const { data: dbEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('mission_id', missionId)
        .order('timestamp', { ascending: true });

      let events = [];
      
      if (!error && dbEvents) {
        events = dbEvents;
      }

      // Also get any local events for this mission
      const localEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
      
      // Combine and deduplicate events
      const allEvents = [...events, ...localEvents];
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      return uniqueEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Fallback to local storage only
      try {
        const localEvents = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
        return localEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      } catch (localError) {
        console.error('Error fetching local events:', localError);
        toast({
          title: 'Error',
          description: 'Failed to load events.',
          variant: 'destructive',
        });
        return [];
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    createEvent,
    uploadEventPhoto,
    getEventsByMission,
    isLoading,
  };
}