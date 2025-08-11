import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const ALLOWED_ORIGINS = new Set([
  'https://lovable.dev',
  'http://localhost:8080',
  'http://localhost:5173'
]);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

interface WeatherRequest {
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Error response helper
function errorResponse(errorType: string, message: string, status: number, req: Request) {
  console.error(`Error (${status}):`, { errorType, message });
  return new Response(
    JSON.stringify({ error: errorType, message }),
    { 
      status,
      headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' }
    }
  );
}

const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  try {
    // Validate API key configuration
    if (!openWeatherApiKey) {
      return errorResponse('api_key_missing', 'OpenWeatherMap API key not configured', 500, req);
    }

    // Validate request body
    let requestData: WeatherRequest;
    try {
      requestData = await req.json();
    } catch {
      return errorResponse('invalid_request', 'Invalid JSON in request body', 400, req);
    }

    const { latitude, longitude, timestamp } = requestData;

    // Validate required parameters
    if (latitude === undefined || latitude === null || isNaN(latitude)) {
      return errorResponse('invalid_latitude', 'Valid latitude is required', 422, req);
    }

    if (longitude === undefined || longitude === null || isNaN(longitude)) {
      return errorResponse('invalid_longitude', 'Valid longitude is required', 422, req);
    }

    if (!timestamp) {
      return errorResponse('missing_timestamp', 'Timestamp is required', 422, req);
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return errorResponse('latitude_out_of_range', 'Latitude must be between -90 and 90', 422, req);
    }

    if (longitude < -180 || longitude > 180) {
      return errorResponse('longitude_out_of_range', 'Longitude must be between -180 and 180', 422, req);
    }

    // Validate timestamp
    let requestTime: Date;
    try {
      requestTime = new Date(timestamp);
      if (isNaN(requestTime.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      return errorResponse('invalid_timestamp', 'Invalid timestamp format', 422, req);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const oneHourAgo = new Date(requestTime.getTime() - 60 * 60 * 1000);

    // Check if we have recent weather data for this location (within 1 hour and ~1km radius)
    const { data: existingWeather, error: queryError } = await supabase
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

    if (queryError) {
      console.error('Database query error:', queryError);
      return errorResponse('database_error', 'Failed to query existing weather data', 500, req);
    }

    if (existingWeather && existingWeather.length > 0) {
      console.log('Found cached weather data:', existingWeather[0].id);
      return new Response(
        JSON.stringify({ weatherData: existingWeather[0] }),
        { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch new weather data from OpenWeatherMap
    console.log('Fetching new weather data for:', latitude, longitude);
    
    let weatherResponse: Response;
    try {
      weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}&units=metric`
      );
    } catch (fetchError) {
      console.error('Network error fetching weather data:', fetchError);
      return errorResponse('network_error', 'Failed to connect to weather service', 500, req);
    }

    if (!weatherResponse.ok) {
      console.error('OpenWeatherMap API error:', weatherResponse.status, weatherResponse.statusText);
      
      switch (weatherResponse.status) {
        case 401:
          return errorResponse('api_key_invalid', 'Invalid OpenWeatherMap API key', 500, req);
        case 404:
          return errorResponse('location_not_found', 'Weather data not available for this location', 422, req);
        case 429:
          return errorResponse('rate_limit_exceeded', 'Weather service rate limit exceeded', 429, req);
        default:
          return errorResponse('weather_api_error', `Weather service error: ${weatherResponse.status}`, 500, req);
      }
    }

    let weatherData: any;
    try {
      weatherData = await weatherResponse.json();
    } catch {
      return errorResponse('invalid_weather_response', 'Invalid response from weather service', 500, req);
    }

    // Validate weather data structure
    if (!weatherData.main || !weatherData.weather || !Array.isArray(weatherData.weather) || weatherData.weather.length === 0) {
      return errorResponse('incomplete_weather_data', 'Incomplete weather data received', 500, req);
    }

    console.log('Weather API response:', weatherData);

    // Store weather data in our database with epoch ms
    const weatherRecord = {
      latitude: parseFloat(latitude.toString()),
      longitude: parseFloat(longitude.toString()),
      timestamp: requestTime.toISOString(),
      timestamp_epoch_ms: requestTime.getTime(), // Store epoch ms as primary
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
      
      // Check for specific database errors
      if (saveError.code === '23505') { // Unique constraint violation
        return errorResponse('duplicate_weather_data', 'Weather data for this location and time already exists', 409, req);
      }
      
      return errorResponse('database_save_error', 'Failed to save weather data to database', 500, req);
    }

    console.log('Weather data saved successfully:', savedWeather.id);

    return new Response(
      JSON.stringify({ weatherData: savedWeather }),
      { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error in fetch-weather function:', error);
    return errorResponse('server_error', 'An unexpected error occurred', 500, req);
  }
});