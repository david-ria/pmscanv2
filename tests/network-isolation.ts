import { Page } from '@playwright/test';

/**
 * Sets up network isolation to block all external requests except localhost preview server
 */
export async function setupNetworkIsolation(page: Page) {
  await page.route('**/*', async (route, request) => {
    const url = request.url();
    const method = request.method();
    
    // Allow localhost preview server (our app)
    if (url.startsWith('http://127.0.0.1:4173') || url.startsWith('http://localhost:4173')) {
      return route.continue();
    }
    
    // Allow data URLs (inline assets, base64 images, etc.)
    if (url.startsWith('data:')) {
      return route.continue();
    }
    
    // Allow blob URLs (generated content like downloads)
    if (url.startsWith('blob:')) {
      return route.continue();
    }
    
    // Allow chrome-extension URLs (browser extensions)
    if (url.startsWith('chrome-extension://')) {
      return route.continue();
    }
    
    // Block all external requests (Supabase, APIs, CDNs, etc.)
    if (
      url.includes('supabase.co') ||
      url.includes('supabase.in') ||
      url.includes('googleapis.com') ||
      url.includes('mapbox.com') ||
      url.includes('openweathermap.org') ||
      url.includes('nominatim.openstreetmap.org') ||
      url.includes('cdnjs.cloudflare.com') ||
      url.includes('jsdelivr.net') ||
      url.includes('unpkg.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.startsWith('https://') ||
      url.startsWith('http://') && !url.includes('127.0.0.1') && !url.includes('localhost')
    ) {
      console.log(`🚫 BLOCKED external request: ${method} ${url}`);
      return route.abort('blockedbyclient');
    }
    
    // Allow other local requests by default
    console.log(`✅ ALLOWED request: ${method} ${url}`);
    return route.continue();
  });
  
  console.log('🔒 Network isolation setup complete - only localhost:4173 allowed');
}