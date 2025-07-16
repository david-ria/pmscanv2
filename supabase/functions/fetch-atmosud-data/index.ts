import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const atmosudApiKey = Deno.env.get('ATMOSUD_API_KEY');
const openWeatherApiKey = Deno.env.get('OPENWEATHERMAP_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { latitude, longitude, timestamp } = await req.json();

    if (!latitude || !longitude || !timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: latitude, longitude, timestamp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestTime = new Date(timestamp);
    const oneHourAgo = new Date(requestTime.getTime() - 60 * 60 * 1000);

    // Check if we have recent air quality data for this location (within 1 hour and ~5km radius)
    const { data: existingData } = await supabase
      .from('air_quality_data')
      .select('*')
      .in('data_source', ['atmosud', 'openweathermap'])
      .gte('timestamp', oneHourAgo.toISOString())
      .lte('timestamp', requestTime.toISOString())
      .gte('latitude', latitude - 0.05) // ~5km radius
      .lte('latitude', latitude + 0.05)
      .gte('longitude', longitude - 0.05)
      .lte('longitude', longitude + 0.05)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (existingData && existingData.length > 0) {
      console.log('Found cached Atmosud data:', existingData[0].id);
      return new Response(
        JSON.stringify({ airQualityData: existingData[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch new air quality data from Atmosud API
    console.log('Fetching new Atmosud data for:', latitude, longitude);
    
    // Try different API endpoints as the API structure may have changed
    const atmosudHeaders: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Air Quality App',
      'Content-Type': 'application/json'
    };
    
    if (atmosudApiKey) {
      atmosudHeaders['Authorization'] = `Bearer ${atmosudApiKey}`;
      atmosudHeaders['X-API-Key'] = atmosudApiKey;
    }

    console.log('Trying Atmosud API with headers:', JSON.stringify(atmosudHeaders, null, 2));

    // Try the main measurements endpoint first
    let atmosudResponse: Response;
    let apiUrl = `https://api.atmosud.org/srt/1.0/measurements/latest?lat=${latitude}&lng=${longitude}&radius=10000&pollutants=NO2,O3`;
    
    console.log('Attempting API call to:', apiUrl);
    atmosudResponse = await fetch(apiUrl, { headers: atmosudHeaders });

    if (!atmosudResponse.ok) {
      console.error('Atmosud API error (measurements latest):', atmosudResponse.status, atmosudResponse.statusText);
      const errorText = await atmosudResponse.text();
      console.error('Error response body:', errorText);
      
      // Try alternative endpoint
      apiUrl = `https://api.atmosud.org/observations/stations/nearest?lat=${latitude}&lng=${longitude}&limit=5`;
      console.log('Trying alternative endpoint:', apiUrl);
      atmosudResponse = await fetch(apiUrl, { headers: atmosudHeaders });

      if (!atmosudResponse.ok) {
        console.error('Atmosud stations API also failed:', atmosudResponse.status, atmosudResponse.statusText);
        const errorText2 = await atmosudResponse.text();
        console.error('Stations error response body:', errorText2);
        
        // Try without authentication
        console.log('Trying without authentication...');
        const publicHeaders = {
          'Accept': 'application/json',
          'User-Agent': 'Air Quality App'
        };
        
        atmosudResponse = await fetch(
          `https://api.atmosud.org/observations/stations/nearest?lat=${latitude}&lng=${longitude}&limit=5`,
          { headers: publicHeaders }
        );

        if (!atmosudResponse.ok) {
          console.error('All Atmosud API endpoints failed. Trying OpenWeatherMap as fallback...');
          
          // Fallback to OpenWeatherMap Air Pollution API
          if (openWeatherApiKey) {
            console.log('Using OpenWeatherMap Air Pollution API for Marseille coordinates:', latitude, longitude);
            
            const owmResponse = await fetch(
              `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${openWeatherApiKey}`
            );
            
            if (owmResponse.ok) {
              const owmData = await owmResponse.json();
              console.log('OpenWeatherMap Air Pollution response:', owmData);
              
              const airQualityRecord = await processOpenWeatherMapData(owmData, latitude, longitude, requestTime);
              
              if (airQualityRecord) {
                const { data: savedData, error: saveError } = await supabase
                  .from('air_quality_data')
                  .insert(airQualityRecord)
                  .select()
                  .single();

                if (saveError) {
                  console.error('Error saving OpenWeatherMap air quality data:', saveError);
                } else {
                  console.log('OpenWeatherMap air quality data saved successfully:', savedData.id);
                  return new Response(
                    JSON.stringify({ airQualityData: savedData }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }
            } else {
              console.error('OpenWeatherMap API also failed:', owmResponse.status, owmResponse.statusText);
            }
          }
          
          return new Response(
            JSON.stringify({ 
              error: 'All air quality API endpoints failed',
              details: {
                atmosudStatus: atmosudResponse.status,
                atmosudStatusText: atmosudResponse.statusText,
                hasOpenWeatherKey: !!openWeatherApiKey
              }
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const responseData = await atmosudResponse.json();
    console.log('Atmosud API response:', responseData);

    // Process and store the measurements data
    const airQualityRecord = await processAtmosudData(responseData, latitude, longitude, requestTime);
    
    if (airQualityRecord) {
      const { data: savedData, error: saveError } = await supabase
        .from('air_quality_data')
        .insert(airQualityRecord)
        .select()
        .single();

      if (saveError) {
        console.error('Error saving air quality data:', saveError);
        return new Response(
          JSON.stringify({ error: 'Failed to save air quality data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Air quality data saved successfully:', savedData.id);
      return new Response(
        JSON.stringify({ airQualityData: savedData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stationsData = responseData;
    console.log('Atmosud stations response:', stationsData);

    // Find the nearest station and get its measurements
    if (stationsData && Array.isArray(stationsData) && stationsData.length > 0) {
      const nearestStation = stationsData[0];
      
      // Try to get recent measurements from the nearest station
      const stationMeasurementsResponse = await fetch(
        `https://api.atmosud.org/observations/stations/${nearestStation.id}/measurements/latest?pollutants=NO2,O3`,
        { headers: atmosudHeaders }
      );

      if (stationMeasurementsResponse.ok) {
        const measurementsData = await stationMeasurementsResponse.json();
        console.log('Station measurements response:', measurementsData);

        const airQualityRecord = await processStationData(measurementsData, nearestStation, requestTime);
        
        if (airQualityRecord) {
          const { data: savedData, error: saveError } = await supabase
            .from('air_quality_data')
            .insert(airQualityRecord)
            .select()
            .single();

          if (saveError) {
            console.error('Error saving air quality data:', saveError);
            return new Response(
              JSON.stringify({ error: 'Failed to save air quality data' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('Air quality data saved successfully:', savedData.id);
          return new Response(
            JSON.stringify({ airQualityData: savedData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // If we couldn't get data, return an error
    return new Response(
      JSON.stringify({ 
        error: 'No air quality data available for this location',
        debug: { stationsData }
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-atmosud-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processAtmosudData(data: any, latitude: number, longitude: number, timestamp: Date) {
  try {
    let no2Value = null;
    let o3Value = null;
    let stationName = null;
    let stationId = null;

    // Try to extract NO2 and O3 values from the response
    // The exact structure depends on the API response format
    if (Array.isArray(data)) {
      for (const measurement of data) {
        if (measurement.pollutant === 'NO2' || measurement.parameter === 'NO2') {
          no2Value = measurement.value || measurement.concentration;
          stationName = measurement.station?.name || measurement.stationName;
          stationId = measurement.station?.id || measurement.stationId;
        }
        if (measurement.pollutant === 'O3' || measurement.parameter === 'O3') {
          o3Value = measurement.value || measurement.concentration;
          stationName = stationName || measurement.station?.name || measurement.stationName;
          stationId = stationId || measurement.station?.id || measurement.stationId;
        }
      }
    } else if (data.measurements) {
      // Handle nested structure
      for (const measurement of data.measurements) {
        if (measurement.pollutant === 'NO2' || measurement.parameter === 'NO2') {
          no2Value = measurement.value || measurement.concentration;
        }
        if (measurement.pollutant === 'O3' || measurement.parameter === 'O3') {
          o3Value = measurement.value || measurement.concentration;
        }
      }
      stationName = data.station?.name;
      stationId = data.station?.id;
    }

    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp.toISOString(),
      no2_value: no2Value ? parseFloat(no2Value) : null,
      o3_value: o3Value ? parseFloat(o3Value) : null,
      station_name: stationName,
      station_id: stationId?.toString(),
      data_source: 'atmosud'
    };
  } catch (error) {
    console.error('Error processing Atmosud data:', error);
    return null;
  }
}

async function processStationData(data: any, station: any, timestamp: Date) {
  try {
    let no2Value = null;
    let o3Value = null;

    // Extract measurements from station data
    if (Array.isArray(data)) {
      for (const measurement of data) {
        if (measurement.pollutant === 'NO2' || measurement.parameter === 'NO2') {
          no2Value = measurement.value || measurement.concentration;
        }
        if (measurement.pollutant === 'O3' || measurement.parameter === 'O3') {
          o3Value = measurement.value || measurement.concentration;
        }
      }
    }

    return {
      latitude: station.latitude || station.lat,
      longitude: station.longitude || station.lng || station.lon,
      timestamp: timestamp.toISOString(),
      no2_value: no2Value ? parseFloat(no2Value) : null,
      o3_value: o3Value ? parseFloat(o3Value) : null,
      station_name: station.name,
      station_id: station.id?.toString(),
      data_source: 'atmosud'
    };
  } catch (error) {
    console.error('Error processing station data:', error);
    return null;
  }
}

async function processOpenWeatherMapData(data: any, latitude: number, longitude: number, timestamp: Date) {
  try {
    console.log('Processing OpenWeatherMap data:', data);
    
    if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) {
      console.error('Invalid OpenWeatherMap response structure');
      return null;
    }

    const pollution = data.list[0];
    if (!pollution || !pollution.components) {
      console.error('No pollution components found in OpenWeatherMap response');
      return null;
    }

    const components = pollution.components;
    
    return {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: timestamp.toISOString(),
      no2_value: components.no2 ? parseFloat(components.no2) : null,
      o3_value: components.o3 ? parseFloat(components.o3) : null,
      station_name: 'OpenWeatherMap',
      station_id: 'owm',
      data_source: 'openweathermap'
    };
  } catch (error) {
    console.error('Error processing OpenWeatherMap data:', error);
    return null;
  }
}