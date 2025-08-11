import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Return current server time in epoch milliseconds
    const serverEpochMs = Date.now();
    
    return new Response(
      JSON.stringify({ 
        epochMs: serverEpochMs,
        serverEpochMs: serverEpochMs,
        iso: new Date(serverEpochMs).toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Server time error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'server_error',
        message: 'Failed to get server time'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});