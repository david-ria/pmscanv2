import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import { StandardEvent, normalizeEvent, eventToStorageFormat, sortEventsByTimestamp } from '@/utils/eventUtils';

// Export legacy interface for backwards compatibility
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

  const createEvent = async (eventData: Partial<StandardEvent>) => {
    setIsLoading(true);
    try {
      if (!user) {
        console.error('No user found when trying to create event');
        throw new Error('User must be logged in to create events');
      }

      console.log('Creating event with user:', user.id);
      console.log('Event data:', eventData);

      // Normalize event data to ensure consistency
      const normalizedEvent = normalizeEvent({
        ...eventData,
        createdBy: user.id,
        timestamp: eventData.timestamp || new Date(),
      });

      // Store event locally using consistent format
      const existingEvents = JSON.parse(localStorage.getItem('pending_events') || '[]');
      existingEvents.push(eventToStorageFormat(normalizedEvent));
      localStorage.setItem('pending_events', JSON.stringify(existingEvents));

      console.log('Event stored locally:', normalizedEvent);
      
      toast({
        title: 'Event Recorded',
        description: 'Event has been recorded and will be saved with the mission.',
      });
      
      return normalizedEvent;
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

      let events: StandardEvent[] = [];
      
      if (!error && dbEvents) {
        events = dbEvents.map(normalizeEvent);
      }

      // Also get any local events for this mission
      const localEventsRaw = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
      const localEvents = localEventsRaw.map(normalizeEvent);
      
      // Combine and deduplicate events
      const allEvents = [...events, ...localEvents];
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      return sortEventsByTimestamp(uniqueEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      
      // Fallback to local storage only
      try {
        const localEventsRaw = JSON.parse(localStorage.getItem(`mission_events_${missionId}`) || '[]');
        const localEvents = localEventsRaw.map(normalizeEvent);
        return sortEventsByTimestamp(localEvents);
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