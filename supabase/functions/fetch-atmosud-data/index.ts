import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const ALLOWED_ORIGINS = new Set([
  'https://staging.example.com',
  'https://app.example.com'
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

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { latitude, longitude, timestamp } = await req.json();

    if (!latitude || !longitude || !timestamp) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: latitude, longitude, timestamp' }),
        { status: 400, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
      );
    }

    const requestTime = new Date(timestamp);
    const oneHourAgo = new Date(requestTime.getTime() - 60 * 60 * 1000);

    // Check if we have recent air quality data for this location (within 1 hour and ~5km radius)
    const { data: existingData } = await supabase
      .from('air_quality_data')
      .select('*')
      .eq('data_source', 'atmosud')
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
        { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
      );
    }

    // Fetch new air quality data from Atmosud API
    console.log('Fetching new Atmosud data for:', latitude, longitude);
    
    // Try to fetch from Atmosud observations API
    // The API might require specific parameters or authentication
    const atmosudResponse = await fetch(
      `https://api.atmosud.org/observations/stations/nearest?lat=${latitude}&lng=${longitude}&limit=5`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Air Quality App'
        }
      }
    );

    if (!atmosudResponse.ok) {
      console.error('Atmosud API error:', atmosudResponse.status, atmosudResponse.statusText);
      
      // Try alternative endpoint for measurements
      const measurementsResponse = await fetch(
        `https://api.atmosud.org/observations/measurements/latest?lat=${latitude}&lng=${longitude}&pollutants=NO2,O3`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Air Quality App'
          }
        }
      );

      if (!measurementsResponse.ok) {
        console.error('Atmosud measurements API also failed:', measurementsResponse.status);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch air quality data from Atmosud API' }),
          { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
        );
      }

      const measurementsData = await measurementsResponse.json();
      console.log('Atmosud measurements response:', measurementsData);

      // Process and store the measurements data
      const airQualityRecord = await processAtmosudData(measurementsData, latitude, longitude, requestTime);
      
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
            { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
          );
        }

        console.log('Air quality data saved successfully:', savedData.id);
        return new Response(
          JSON.stringify({ airQualityData: savedData }),
          { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
        );
      }
    }

    const stationsData = await atmosudResponse.json();
    console.log('Atmosud stations response:', stationsData);

    // Find the nearest station and get its measurements
    if (stationsData && Array.isArray(stationsData) && stationsData.length > 0) {
      const nearestStation = stationsData[0];
      
      // Try to get recent measurements from the nearest station
      const stationMeasurementsResponse = await fetch(
        `https://api.atmosud.org/observations/stations/${nearestStation.id}/measurements/latest?pollutants=NO2,O3`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Air Quality App'
          }
        }
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
            { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
            );
          }

          console.log('Air quality data saved successfully:', savedData.id);
          return new Response(
            JSON.stringify({ airQualityData: savedData }),
            { headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
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
      { status: 404, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-atmosud-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } }
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