import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserLocation {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAlarm {
  id: string;
  user_id: string;
  name: string;
  pm1_threshold?: number;
  pm25_threshold?: number;
  pm10_threshold?: number;
  notification_frequency: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserEvent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  event_type: string;
  start_date?: string;
  end_date?: string;
  recurrence?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useUserLocations = () => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createLocation = async (
    location: Omit<UserLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_locations').insert({
        ...location,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location created successfully',
      });

      await fetchLocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateLocation = async (id: string, updates: Partial<UserLocation>) => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });

      await fetchLocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      await fetchLocations();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return {
    locations,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
    refetch: fetchLocations,
  };
};

export const useUserActivities = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .order('name');

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async (
    activity: Omit<UserActivity, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_activities').insert({
        ...activity,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity created successfully',
      });

      await fetchActivities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create activity',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateActivity = async (id: string, updates: Partial<UserActivity>) => {
    try {
      const { error } = await supabase
        .from('user_activities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });

      await fetchActivities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update activity',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });

      await fetchActivities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete activity',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  return {
    activities,
    loading,
    createActivity,
    updateActivity,
    deleteActivity,
    refetch: fetchActivities,
  };
};

export const useUserAlarms = () => {
  const [alarms, setAlarms] = useState<UserAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlarms = async () => {
    try {
      const { data, error } = await supabase
        .from('user_alarms')
        .select('*')
        .order('name');

      if (error) throw error;
      setAlarms(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch alarms',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createAlarm = async (
    alarm: Omit<UserAlarm, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_alarms').insert({
        ...alarm,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Alarm created successfully',
      });

      await fetchAlarms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create alarm',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateAlarm = async (id: string, updates: Partial<UserAlarm>) => {
    try {
      const { error } = await supabase
        .from('user_alarms')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Alarm updated successfully',
      });

      await fetchAlarms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update alarm',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteAlarm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_alarms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Alarm deleted successfully',
      });

      await fetchAlarms();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete alarm',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAlarms();
  }, []);

  return {
    alarms,
    loading,
    createAlarm,
    updateAlarm,
    deleteAlarm,
    refetch: fetchAlarms,
  };
};

export const useUserEvents = () => {
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_events')
        .select('*')
        .order('name');

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (
    event: Omit<UserEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('user_events').insert({
        ...event,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event created successfully',
      });

      await fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create event',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateEvent = async (id: string, updates: Partial<UserEvent>) => {
    try {
      const { error } = await supabase
        .from('user_events')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event updated successfully',
      });

      await fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update event',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Event deleted successfully',
      });

      await fetchEvents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete event',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return {
    events,
    loading,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};
