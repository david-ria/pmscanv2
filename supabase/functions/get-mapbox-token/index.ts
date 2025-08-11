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

serve(async (req) => {
  console.log('get-mapbox-token function called:', { method: req.method, url: req.url })
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeadersFor(req) })
  }

  try {
    // Validate environment configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');

    if (!supabaseUrl || !serviceRole) {
      return errorResponse('server_misconfigured', 'Supabase configuration missing', 500, req);
    }

    if (!mapboxToken) {
      return errorResponse('mapbox_token_missing', 'Mapbox token not configured', 500, req);
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('missing_authorization', 'Authorization header is required', 401, req);
    }
    
    console.log('Validating user authentication...')
    const supabase = createClient(supabaseUrl, serviceRole, { 
      global: { headers: { Authorization: authHeader } } 
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('Authentication error:', authError.message);
      return errorResponse('invalid_token', 'Invalid or expired authentication token', 401, req);
    }
    
    if (!user) {
      return errorResponse('unauthorized', 'Authentication required', 401, req);
    }
    
    console.log('User authenticated:', user.id);

    console.log('Successfully returning mapbox token')
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        status: 200, 
        headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    console.error('Unexpected error in get-mapbox-token:', error)
    return errorResponse('server_error', 'An unexpected error occurred', 500, req);
  }
})