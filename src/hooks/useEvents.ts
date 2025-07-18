import { useState } from 'react';
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

      const eventWithUser = {
        ...eventData,
        created_by: user.id,
      };

      console.log('Final event data to insert:', eventWithUser);
      const { data, error } = await supabase
        .from('events')
        .insert([eventWithUser])
        .select()
        .single();

      if (error) {
        console.error('Supabase error when creating event:', error);
        throw error;
      }

      console.log('Event created successfully:', data);
      return data;
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

  const getEventsByMission = async (missionId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('mission_id', missionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createEvent,
    uploadEventPhoto,
    getEventsByMission,
    isLoading,
  };
}