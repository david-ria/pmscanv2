module.exports = {
  ci: {
    collect: {
      url: ['http://127.0.0.1:4173/'],
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:   http://127.0.0.1:4173/',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --disable-gpu',
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // LCP < 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'max-potential-fid': ['error', { maxNumericValue: 100 }], // Interaction delay < 100ms
        
        // Bundle size constraints
        'total-byte-weight': ['error', { maxNumericValue: 512000 }], // ~500KB total (uncompressed)
        'uses-text-compression': 'error', // Ensure gzip is enabled
        
        // Performance basics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        
        // Best practices
        'unused-javascript': ['warn', { maxNumericValue: 20000 }],
        'modern-image-formats': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // Accessibility basics
        'color-contrast': 'warn',
        'heading-order': 'warn',
        
        // SEO basics  
        'meta-description': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};