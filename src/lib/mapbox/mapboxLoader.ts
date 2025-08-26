import { supabase } from '@/integrations/supabase/client';

let mapboxToken: string | null = null;
let mapboxGLLoaded = false;

export async function getMapboxToken(): Promise<string> {
  if (mapboxToken) {
    console.log('🗺️ Using cached Mapbox token');
    return mapboxToken;
  }
  
  console.log('🗺️ Fetching Mapbox token from Supabase...');
  
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (error) {
      console.error('🗺️ Failed to get Mapbox token:', error);
      throw new Error('Failed to get Mapbox token');
    }
    
    if (!data?.token) {
      console.error('🗺️ No Mapbox token found in response:', data);
      throw new Error('No Mapbox token found');
    }
    
    console.log('🗺️ Successfully retrieved Mapbox token');
    mapboxToken = data.token;
    return mapboxToken;
  } catch (error) {
    console.error('🗺️ Error fetching Mapbox token:', error);
    throw error;
  }
}

export async function loadMapboxGL() {
  if (mapboxGLLoaded) {
    console.log('🗺️ Using cached Mapbox GL');
    return (window as any).mapboxgl;
  }
  
  console.log('🗺️ Loading Mapbox GL dynamically...');
  
  try {
    // Dynamically import Mapbox GL
    console.log('🗺️ Importing Mapbox GL module...');
    const mapboxgl = await import('mapbox-gl');
    
    // Import CSS
    console.log('🗺️ Importing Mapbox GL CSS...');
    await import('mapbox-gl/dist/mapbox-gl.css');
    
    // Get and set the token
    console.log('🗺️ Setting up Mapbox token...');
    const token = await getMapboxToken();
    mapboxgl.default.accessToken = token;
    
    // Store globally for reuse
    (window as any).mapboxgl = mapboxgl.default;
    mapboxGLLoaded = true;
    
    console.log('🗺️ Mapbox GL loaded successfully');
    return mapboxgl.default;
  } catch (error) {
    console.error('🗺️ Failed to load Mapbox GL:', error);
    throw new Error('Failed to load Mapbox GL');
  }
}