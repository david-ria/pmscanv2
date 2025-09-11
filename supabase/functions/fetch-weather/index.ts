import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// Safe JSON parsing utility for edge functions (works with Request or Response)
async function safeJson<T = unknown>(reqOrRes: Request | Response): Promise<T | null> {
  const ct = reqOrRes.headers.get('content-type') || '';
  // If it's a Response, respect the HTTP status
  if (reqOrRes instanceof Response) {
    if (!reqOrRes.ok) return null;
  }
  if (!ct.toLowerCase().includes('application/json')) return null;
  try {
    // Both Request and Response have .json()
    return await (reqOrRes as any).json();
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

    const { latitude, longitude, timestamp } = requestBody as any;

    const latNum = Number(latitude);
    const lonNum = Number(longitude);

    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing latitude/longitude' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided timestamp or default to now
    let requestTime = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(requestTime.getTime())) {
      requestTime = new Date();
    }
    const oneHourAgo = new Date(requestTime.getTime() - 60 * 60 * 1000);

    // Check if we have recent weather data for this location (within 1 hour and ~1km radius)
    const { data: existingWeather } = await supabase
      .from('weather_data')
      .select('*')
      .gte('timestamp', oneHourAgo.toISOString())
      .lte('timestamp', requestTime.toISOString())
      .gte('latitude', latNum - 0.01) // ~1km radius
      .lte('latitude', latNum + 0.01)
      .gte('longitude', lonNum - 0.01)
      .lte('longitude', lonNum + 0.01)
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
    if (!openWeatherApiKey) {
      console.error('Missing OPENWEATHERMAP_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Weather service temporarily unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching new weather data for:', latNum, lonNum);
    
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latNum}&lon=${lonNum}&appid=${openWeatherApiKey}&units=metric`
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
      latitude: latNum,
      longitude: lonNum,
      timestamp: requestTime.toISOString(),
      temperature: weatherData.main?.temp,
      humidity: weatherData.main?.humidity,
      pressure: weatherData.main?.pressure,
      weather_main: weatherData.weather?.[0]?.main,
      weather_description: weatherData.weather?.[0]?.description,
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