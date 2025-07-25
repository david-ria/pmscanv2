import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Bundle analyzer plugin (conditionally loaded)
const getBundleAnalyzer = async () => {
  if (process.env.ANALYZE === 'true') {
    const { visualizer } = await import('rollup-plugin-visualizer');
    return visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap' // or 'sunburst', 'network'
    });
  }
  return null;
};

export default defineConfig(async ({ command, mode }) => {
  const plugins = [react()];
  
  // Add bundle analyzer in build mode with ANALYZE=true
  if (command === 'build' && process.env.ANALYZE === 'true') {
    const analyzer = await getBundleAnalyzer();
    if (analyzer) plugins.push(analyzer);
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Optimize bundle splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for core React libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // UI libraries chunk
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-toast',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              'lucide-react'
            ],
            
            // Large dependencies that are already dynamically imported
            // These will only be included if actually used
            'maps': ['mapbox-gl'],
            'charts': ['recharts'],
            'tensorflow': ['@tensorflow/tfjs'],
            'supabase': ['@supabase/supabase-js'],
            'pdf': ['jspdf', 'html2canvas'],
            'forms': ['react-hook-form', 'zod'],
            'dates': ['date-fns'],
            'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector']
          }
        }
      },
      
      // Increase chunk size warning limit for vendor chunks
      chunkSizeWarningLimit: 1000,
      
      // Enable source maps for production debugging (optional)
      sourcemap: mode === 'development',
      
      // Minification options
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.logs in production
          drop_debugger: true,
          pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : []
        }
      },
      
      // Target modern browsers for smaller bundle
      target: 'esnext'
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        // Core dependencies that should be pre-bundled
        'react',
        'react-dom',
        'react-router-dom',
        'clsx',
        'tailwind-merge'
      ],
      exclude: [
        // Large dependencies that are dynamically imported
        'mapbox-gl',
        'recharts',
        '@tensorflow/tfjs',
        'jspdf',
        'html2canvas',
        '@capacitor-community/bluetooth-le'
      ]
    },
    
    // Server configuration for development
    server: {
      // Enable HTTP/2 for better performance
      https: false, // Set to true if you have SSL certs
      
      // Preload hints for critical resources
      preTransformRequests: false // Disable for faster dev startup
    }
  };
});