import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NominatimResponse {
  display_name: string;
  place_type?: string;
  class?: string;
  type?: string;
  amenity?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

function mapNominatimToContext(data: NominatimResponse): string {
  const { class: placeClass, type, amenity } = data;
  
  // Map Nominatim types to our location contexts
  if (amenity) {
    switch (amenity) {
      case 'restaurant':
      case 'cafe':
      case 'fast_food':
      case 'food_court':
        return 'Indoor restaurant';
      case 'hospital':
      case 'clinic':
      case 'pharmacy':
        return 'Indoor hospital';
      case 'school':
      case 'university':
      case 'college':
        return 'Indoor school';
      case 'gym':
      case 'fitness_centre':
        return 'Indoor gym';
      case 'library':
        return 'Indoor library';
      case 'place_of_worship':
        return 'Indoor';
      case 'fuel':
        return 'Outdoor';
      case 'parking':
        return 'Outdoor parking';
      default:
        return 'Indoor';
    }
  }
  
  if (placeClass) {
    switch (placeClass) {
      case 'highway':
        return 'Outdoor transport';
      case 'railway':
        return 'Outdoor transport';
      case 'natural':
        return 'Outdoor';
      case 'landuse':
        if (type === 'residential') return 'Outdoor at home';
        if (type === 'commercial' || type === 'industrial') return 'Outdoor at work';
        return 'Outdoor';
      case 'building':
        return 'Indoor';
      default:
        return 'Outdoor';
    }
  }
  
  // Default fallback
  return 'Outdoor';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, timestamp, useSmartCaching } = await req.json();

    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required');
    }

    console.log(`Enhancing location context for: ${latitude}, ${longitude} (smart: ${useSmartCaching})`);

    // Smart caching with variable radius and timeframe
    const timeRange = useSmartCaching ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000; // 2h vs 1h
    const cacheThreshold = new Date(Date.now() - timeRange).toISOString();
    const spatialRange = useSmartCaching ? 0.002 : 0.001; // ~200m vs ~100m

    const { data: existingData, error: fetchError } = await supabase
      .from('location_enrichment_data')
      .select('*')
      .gte('timestamp', cacheThreshold)
      .gte('latitude', latitude - spatialRange)
      .lte('latitude', latitude + spatialRange)
      .gte('longitude', longitude - spatialRange)
      .lte('longitude', longitude + spatialRange)
      .order('timestamp', { ascending: false })
      .limit(useSmartCaching ? 3 : 1);

    if (fetchError) {
      console.error('Error fetching existing location data:', fetchError);
    }

    if (existingData && existingData.length > 0) {
      console.log(`Using cached location enrichment data (${existingData.length} entries found)`);
      
      // For smart caching, choose best quality entry
      let cached = existingData[0];
      if (useSmartCaching && existingData.length > 1) {
        // Prefer entries with more specific amenity/class data
        cached = existingData.find(entry => entry.amenity || entry.place_class) || existingData[0];
      }
      
      const enhancedContext = mapNominatimToContext({
        display_name: cached.display_name || '',
        class: cached.place_class || undefined,
        type: cached.place_type || undefined,
        amenity: cached.amenity || undefined,
        address: cached.address_components || {}
      });

      return new Response(JSON.stringify({
        enhanced_context: enhancedContext,
        display_name: cached.display_name,
        source: 'cached',
        cache_quality: cached.amenity || cached.place_class ? 'high' : 'medium',
        raw_data: cached.raw_nominatim_data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from Nominatim API
    console.log('Fetching from Nominatim API');
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&extratags=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'AirQualityApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const nominatimData: NominatimResponse = await response.json();
    console.log('Nominatim response:', nominatimData);

    // Store in database
    const { error: insertError } = await supabase
      .from('location_enrichment_data')
      .insert({
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
        display_name: nominatimData.display_name,
        place_class: nominatimData.class,
        place_type: nominatimData.type,
        amenity: nominatimData.amenity,
        address_components: nominatimData.address || {},
        raw_nominatim_data: nominatimData
      });

    if (insertError) {
      console.error('Error storing location enrichment data:', insertError);
    }

    // Map to our context
    const enhancedContext = mapNominatimToContext(nominatimData);

    return new Response(JSON.stringify({
      enhanced_context: enhancedContext,
      display_name: nominatimData.display_name,
      source: 'nominatim',
      cache_quality: nominatimData.amenity || nominatimData.class ? 'high' : 'medium',
      raw_data: nominatimData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhance-location-context function:', error);
    const err = error as { message?: string } | undefined;
    return new Response(JSON.stringify({ 
      error: err?.message || 'Unknown error',
      enhanced_context: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});