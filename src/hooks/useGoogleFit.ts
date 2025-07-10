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
      // Check if gapi is available
      if (typeof window === 'undefined') {
        reject(new Error('Window object not available'));
        return;
      }

      // Load Google API script if not available
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          console.log('Google API script loaded');
          initGapiAuth().then(resolve).catch(reject);
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load Google API script'));
        };
        
        document.head.appendChild(script);
      } else {
        initGapiAuth().then(resolve).catch(reject);
      }
    });
  }, []);

  const initGapiAuth = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      console.log('Loading Google Auth2 library...');
      window.gapi.load('auth2', {
        callback: async () => {
          try {
            console.log('Google Auth2 library loaded successfully');
            console.log('Getting Google Client ID from Supabase...');
            
            // Get the Google Client ID from Supabase secrets
            const { data: clientIdResponse, error: clientIdError } = await supabase.functions.invoke('get-google-client-id');
            
            if (clientIdError) {
              console.error('Error calling get-google-client-id function:', clientIdError);
              throw new Error(`Failed to get Google Client ID: ${clientIdError.message}`);
            }
            
            const clientId = clientIdResponse?.client_id;
            console.log('Received client ID:', clientId ? 'Got client ID' : 'No client ID');
            
            if (!clientId) {
              throw new Error('Google Client ID not configured in Supabase secrets');
            }
            
            console.log('Initializing Google Auth2 with client ID...');
            window.gapi.auth2.init({
              client_id: clientId,
              scope: 'https://www.googleapis.com/auth/fitness.activity.read'
            }).then(() => {
              console.log('Google Auth2 initialized successfully');
              resolve();
            }).catch((error: any) => {
              console.error('Auth2 init error:', error);
              reject(error);
            });
          } catch (error) {
            console.error('Error in initGapiAuth:', error);
            reject(error);
          }
        },
        onerror: () => {
          console.error('Failed to load Google Auth2 library');
          reject(new Error('Failed to load Google Auth2 library'));
        }
      });
    });
  }, []);

  const connectGoogleFit = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google Fit connection...');
      
      // Load Google API if not already loaded
      if (!window.gapi) {
        console.log('Loading Google API script...');
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => initGoogleAPI();
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
      }
      
      console.log('Initializing Google API...');
      await initGoogleAPI();
      
      console.log('Getting auth instance...');
      const authInstance = window.gapi.auth2.getAuthInstance();
      console.log('Auth instance obtained, attempting sign in...');
      const user = await authInstance.signIn();
      console.log('Sign in successful, getting auth response...');
      const authResponse = user.getAuthResponse();
      console.log('Auth response received');
      
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
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      toast({
        title: "Connection Failed", 
        description: `Failed to connect to Google Fit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      throw error;
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