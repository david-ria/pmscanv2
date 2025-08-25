import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// Safe JSON parsing utility for edge functions
async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) return null;
  if (!ct.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestBody = await safeJson(req);
    
    if (!requestBody) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { latitude, longitude, timestamp } = requestBody;

    if (!latitude || !longitude || !timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: latitude, longitude, timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestTime = new Date(timestamp);
    const oneHourAgo = new Date(requestTime.getTime() - 60 * 60 * 1000);

    // Check if we have recent weather data for this location (within 1 hour and ~1km radius)
    const { data: existingWeather } = await supabase
      .from('weather_data')
      .select('*')
      .gte('timestamp', oneHourAgo.toISOString())
      .lte('timestamp', requestTime.toISOString())
      .gte('latitude', latitude - 0.01) // ~1km radius
      .lte('latitude', latitude + 0.01)
      .gte('longitude', longitude - 0.01)
      .lte('longitude', longitude + 0.01)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (existingWeather && existingWeather.length > 0) {
      console.log('Found cached weather data:', existingWeather[0].id);
      return new Response(
        JSON.stringify({ weatherData: existingWeather[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch new weather data from OpenWeatherMap
    console.log('Fetching new weather data for:', latitude, longitude);
    
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`
    );

    const weatherData = await safeJson(weatherResponse);
    if (!weatherData) {
      console.error('OpenWeatherMap API error: Invalid JSON response');
      return new Response(
        JSON.stringify({ error: 'Failed to parse weather data from OpenWeatherMap' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Weather API response:', weatherData);

    // Store weather data in our database
    const weatherRecord = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: requestTime.toISOString(),
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      weather_main: weatherData.weather[0].main,
      weather_description: weatherData.weather[0].description,
      wind_speed: weatherData.wind?.speed || null,
      wind_direction: weatherData.wind?.deg || null,
      visibility: weatherData.visibility ? weatherData.visibility / 1000 : null, // Convert to km
      uv_index: null, // UV index not available in current weather API
    };

    const { data: savedWeather, error: saveError } = await supabase
      .from('weather_data')
      .insert(weatherRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Error saving weather data:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save weather data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Weather data saved successfully:', savedWeather.id);

    return new Response(
      JSON.stringify({ weatherData: savedWeather }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-weather function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});