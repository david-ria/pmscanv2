import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

serve(async (req) => {
  console.log('get-mapbox-token function called:', { method: req.method, url: req.url })
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) })
  }

  try {
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN')
    console.log('Mapbox token exists:', !!mapboxToken)
    
    if (!mapboxToken) {
      console.error('MAPBOX_PUBLIC_TOKEN not found in environment')
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Successfully returning mapbox token')
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        status: 200, 
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in get-mapbox-token:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get Mapbox token' }),
      { 
        status: 500, 
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } 
      }
    )
  }
})
