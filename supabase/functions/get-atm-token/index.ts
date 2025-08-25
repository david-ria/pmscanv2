import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Get the ATM API bearer token from secrets
    const atmToken = Deno.env.get('ATM_API_BEARER_TOKEN')
    
    if (!atmToken) {
      return new Response('ATM token not configured', { status: 500 })
    }

    return new Response(JSON.stringify({ 
      token: atmToken,
      endpoint: 'https://api.atm.ovh/api/v3.0/measurements'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error getting ATM token:', error)
    return new Response('Internal server error', { status: 500 })
  }
})