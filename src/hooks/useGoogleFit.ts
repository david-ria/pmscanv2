import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoogleFitActivity {
  id: string;
  activity_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  steps?: number;
  distance_meters?: number;
  calories?: number;
}

interface UseGoogleFitReturn {
  activities: GoogleFitActivity[];
  isLoading: boolean;
  isAuthenticated: boolean;
  connectGoogleFit: () => Promise<void>;
  syncActivities: (startTime?: number, endTime?: number) => Promise<void>;
  getRecentActivity: () => GoogleFitActivity | null;
}

export function useGoogleFit(): UseGoogleFitReturn {
  const [activities, setActivities] = useState<GoogleFitActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize Google API client
  const initGoogleAPI = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.gapi) {
        reject(new Error('Google API not loaded'));
        return;
      }

      window.gapi.load('auth2', {
        callback: () => {
        window.gapi.auth2.init({
          client_id: '1039486564308-bk68q46o0cr92u2ncdkso30l8m9s51nn.apps.googleusercontent.com', // Default Google API client ID for testing
          scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.location.read'
        }).then(resolve, reject);
        },
        onerror: reject
      });
    });
  }, []);

  const connectGoogleFit = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load Google API if not already loaded
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => initGoogleAPI();
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      await initGoogleAPI();
      
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      const authResponse = user.getAuthResponse();
      
      setAccessToken(authResponse.access_token);
      setIsAuthenticated(true);
      
      toast({
        title: "Google Fit Connected",
        description: "Successfully connected to Google Fit API"
      });

      // Sync recent activities
      await syncActivities();
      
    } catch (error) {
      console.error('Error connecting to Google Fit:', error);
      toast({
        title: "Connection Failed", 
        description: "Failed to connect to Google Fit",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [initGoogleAPI, toast]);

  const syncActivities = useCallback(async (startTime?: number, endTime?: number) => {
    if (!accessToken) {
      console.warn('No access token available for Google Fit sync');
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No user session');
      }

      const response = await supabase.functions.invoke('google-fit-sync', {
        body: {
          accessToken,
          startTime: startTime || Date.now() - 24 * 60 * 60 * 1000, // Default: last 24 hours
          endTime: endTime || Date.now()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Fetch updated activities from database
      const { data: updatedActivities, error: fetchError } = await supabase
        .from('fitness_activities')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      setActivities(updatedActivities || []);
      
      toast({
        title: "Activities Synced",
        description: `Processed ${response.data?.activitiesProcessed || 0} activities`
      });

    } catch (error) {
      console.error('Error syncing activities:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync Google Fit activities",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

  const getRecentActivity = useCallback((): GoogleFitActivity | null => {
    if (activities.length === 0) return null;
    
    // Return the most recent activity within the last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentActivity = activities.find(activity => 
      new Date(activity.end_time).getTime() > oneHourAgo
    );
    
    return recentActivity || null;
  }, [activities]);

  return {
    activities,
    isLoading,
    isAuthenticated,
    connectGoogleFit,
    syncActivities,
    getRecentActivity
  };
}