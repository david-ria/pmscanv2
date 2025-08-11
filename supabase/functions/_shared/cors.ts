const ALLOWED_ORIGINS = new Set([
  'https://lovable.dev',
  'http://localhost:8080',
  'http://localhost:5173'
]);

// Check if origin matches Lovable project pattern
function isLovableProjectOrigin(origin: string): boolean {
  return /^https:\/\/[a-f0-9-]+\.lovableproject\.com$/.test(origin);
}

function corsHeadersFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) || isLovableProjectOrigin(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Legacy export for compatibility - prefer corsHeadersFor(req)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '', // Will be empty unless using corsHeadersFor
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export { corsHeadersFor };