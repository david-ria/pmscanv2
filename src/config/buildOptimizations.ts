// Production build optimization script
// Removes development-only code and optimizes for production

/**
 * Build-time optimizations that are applied during production builds
 * This file is processed by the build system to optimize the final bundle
 */

// Dead code elimination patterns
const DEVELOPMENT_PATTERNS = [
  /console\.(debug|log)\(/g,
  /\/\*\s*DEV_ONLY\s*\*\/[\s\S]*?\/\*\s*END_DEV_ONLY\s*\*\//g,
  /if\s*\(\s*process\.env\.NODE_ENV\s*===\s*['"]development['"]\s*\)\s*\{[\s\S]*?\}/g,
];

// Production optimizations
const PRODUCTION_REPLACEMENTS = [
  // Remove development logging
  {
    pattern: /console\.debug\([^)]*\);?/g,
    replacement: ''
  },
  // Optimize process.env checks
  {
    pattern: /process\.env\.NODE_ENV\s*===\s*['"]development['"]/g,
    replacement: 'false'
  },
  {
    pattern: /process\.env\.NODE_ENV\s*===\s*['"]production['"]/g,
    replacement: 'true'
  },
  // Remove development-only imports
  {
    pattern: /import\s+.*from\s+['"].*\/dev\/.*['"];?\n?/g,
    replacement: ''
  },
];

/**
 * Bundle analysis and optimization hints
 */
export const BundleOptimizations = {
  // Critical path resources (should be inlined)
  criticalResources: [
    'src/index.css',
    'src/main.tsx',
    'src/App.tsx',
    'src/pages/RealTime.tsx'
  ],

  // Code splitting boundaries
  chunkBoundaries: [
    'node_modules', // Vendor chunks
    'src/pages',     // Route-based chunks
    'src/components/MapboxMap', // Map features
    'src/components/Analysis',  // Analysis features
    'src/lib/pmscan',          // Bluetooth functionality
  ],

  // Preload candidates (high priority)
  preloadCandidates: [
    'react',
    'react-dom',
    '@/contexts/AuthContext',
    // Removed RecordingContext - now using unified RecordingService
  ],

  // Lazy load candidates (low priority)
  lazyLoadCandidates: [
    'mapbox-gl',
    'recharts',
    '@tensorflow/tfjs',
    'jspdf',
    'html2canvas',
  ],
};

/**
 * Performance budgets for monitoring
 */
export const PerformanceBudgets = {
  // File size limits (gzipped)
  maxBundleSize: 500 * 1024,      // 500KB
  maxVendorSize: 300 * 1024,      // 300KB  
  maxAsyncChunkSize: 200 * 1024,  // 200KB
  
  // Runtime limits
  maxInitialLoadTime: 2000,       // 2 seconds
  maxRouteTransition: 500,        // 500ms
  maxInteractionDelay: 100,       // 100ms

  // Core Web Vitals targets
  targetLCP: 2500,                // Largest Contentful Paint
  targetFID: 100,                 // First Input Delay  
  targetCLS: 0.1,                 // Cumulative Layout Shift
  targetTTFB: 800,                // Time to First Byte
};

/**
 * Tree shaking optimization hints
 */
export const TreeShakingOptimizations = {
  // Libraries that support tree shaking
  treeShakable: [
    'date-fns',
    'lodash-es',
    'recharts',
    '@radix-ui/react-*',
  ],

  // Libraries that need specific import patterns
  optimizedImports: {
    'date-fns': 'import { format } from "date-fns/format"',
    'recharts': 'import { LineChart } from "recharts/lib/chart/LineChart"',
    'lodash': 'import map from "lodash/map"',
  },

  // Side effect free modules
  sideEffectFree: [
    '@/lib/utils',
    '@/utils/*',
    '@/hooks/*',
    '@/types/*',
  ],
};

/**
 * Development vs Production configuration
 */
export const EnvironmentConfig = {
  development: {
    enableLogging: true,
    enablePerformanceMonitoring: true,
    enableDebugMode: true,
    preserveConsoleOutput: true,
    enableSourceMaps: true,
  },

  production: {
    enableLogging: false,
    enablePerformanceMonitoring: false,
    enableDebugMode: false,
    preserveConsoleOutput: false,
    enableSourceMaps: false,
    
    // Production optimizations
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
  },
};

/**
 * Runtime feature flags
 */
export const FeatureFlags = {
  // Experimental features
  enableExperimentalMapFeatures: false,
  enableAdvancedAnalytics: false,
  enableBetaUI: false,
  
  // Performance features
  enableWebWorkers: true,
  enableServiceWorker: true,
  enablePrefetching: true,
  enableImageOptimization: true,
  
  // A/B testing
  testVariants: {
    mapLoadingStrategy: 'lazy', // 'eager' | 'lazy' | 'user-triggered'
    chartRenderingEngine: 'canvas', // 'svg' | 'canvas'
    dataProcessingMode: 'worker', // 'main' | 'worker'
  },
};

// Export configuration based on environment
const isProduction = process.env.NODE_ENV === 'production';
export const currentConfig = isProduction 
  ? EnvironmentConfig.production 
  : EnvironmentConfig.development;

console.debug('[BUILD] 🚀 Build optimizations configured for:', process.env.NODE_ENV);