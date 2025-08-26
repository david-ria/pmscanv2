import { supabase } from '@/integrations/supabase/client';

let mapboxToken: string | null = null;
let mapboxGLLoaded = false;

export async function getMapboxToken(): Promise<string> {
  if (mapboxToken) return mapboxToken;
  
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error) {
      console.error('Failed to get Mapbox token:', error);
      throw new Error('Failed to get Mapbox token');
    }
    
    if (!data?.token) {
      throw new Error('No Mapbox token found');
    }
    
    mapboxToken = data.token;
    return mapboxToken;
  } catch (error) {
    console.error('Error fetching Mapbox token:', error);
    throw error;
  }
}

export async function loadMapboxGL() {
  if (mapboxGLLoaded) {
    return (window as any).mapboxgl;
  }
  
  try {
    // Dynamically import Mapbox GL
    const mapboxgl = await import('mapbox-gl');
    
    // Import CSS
    await import('mapbox-gl/dist/mapbox-gl.css');
    
    // Get and set the token
    const token = await getMapboxToken();
    mapboxgl.default.accessToken = token;
    
    // Store globally for reuse
    (window as any).mapboxgl = mapboxgl.default;
    mapboxGLLoaded = true;
    
    return mapboxgl.default;
  } catch (error) {
    console.error('Failed to load Mapbox GL:', error);
    throw new Error('Failed to load Mapbox GL');
  }
}