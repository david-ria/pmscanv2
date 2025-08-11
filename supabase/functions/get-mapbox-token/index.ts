import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

  // Authenticate user
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth = req.headers.get('Authorization') || '';
  
  console.log('Validating user authentication...')
  const supabase = createClient(supabaseUrl, serviceRole, { 
    global: { headers: { Authorization: auth } } 
  });
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user || authError) {
    console.log('Authentication failed:', { hasUser: !!user, authError: authError?.message });
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { 
        status: 401, 
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } 
      }
    );
  }
  
  console.log('User authenticated:', user.id);

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
