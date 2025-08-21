module.exports = {
  ci: {
    collect: {
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/auth',
        'http://127.0.0.1:4173/history'
      ],
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
        
        // Network and JS execution constraints
        'total-byte-weight': ['error', { maxNumericValue: 1200000 }], // ≤ 1.2 MB total transfer
        'bootup-time': ['error', { maxNumericValue: 1500 }], // ≤ 1.5s JS execution time
        'network-requests': ['error', { maxNumericValue: 35 }], // ≤ 35 requests
        'uses-text-compression': 'error', // Ensure gzip is enabled
        
        // Performance basics  
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['error', { maxNumericValue: 3000 }], // ≤ 3.0s Speed Index
        'interactive': ['error', { maxNumericValue: 3500 }], // ≤ 3.5s TTI
        
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