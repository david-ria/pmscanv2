import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import type { PluginOption } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [react()];

  // Note: componentTagger temporarily disabled to prevent console errors
  // Will be re-enabled when the issue is resolved
  // if (mode === 'development') {
  //   try {
  //     const { componentTagger } = await import('lovable-tagger');
  //     const tagger = componentTagger();
  //     if (tagger) {
  //       plugins.push(tagger);
  //     }
  //   } catch (error) {
  //     console.warn('lovable-tagger not available:', error);
  //   }
  // }

  return {
    server: {
      host: '::',
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    build: {
      // Optimize chunk size and splitting
        rollupOptions: {
          output: {
            manualChunks: (id: string) => {
              // Vendor chunks
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('node_modules/react-router-dom')) {
                return 'router-vendor';
              }
              if (id.includes('node_modules/@radix-ui')) {
                return 'ui-vendor';
              }
              if (id.includes('node_modules/recharts')) {
                return 'chart-vendor';
              }
              if (id.includes('node_modules/mapbox-gl')) {
                return 'map-vendor';
              }
              if (id.includes('node_modules/@tanstack/react-query')) {
                return 'query-vendor';
              }
              if (id.includes('node_modules/@supabase/supabase-js')) {
                return 'supabase-vendor';
              }
              // Heavy analysis components
              if (id.includes('src/components/Analysis')) {
                return 'analysis-components';
              }
              // Other large dependencies
              if (id.includes('node_modules/date-fns') || 
                  id.includes('node_modules/i18next') ||
                  id.includes('node_modules/react-i18next')) {
                return 'utils-vendor';
              }
              // Default vendor chunk for other node_modules
              if (id.includes('node_modules')) {
                return 'vendor';
              }
            }
          }
        },
      // Enable minification and compression with esbuild (default)
      minify: mode === 'production',
      // Optimize assets
      assetsInlineLimit: 4096,
      // Enable source maps for debugging but optimized for size
      sourcemap: mode === 'development'
    },
    optimizeDeps: {
      // Pre-bundle heavy dependencies
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'mapbox-gl',
        'recharts',
        '@supabase/supabase-js',
        'long',
        'seedrandom'
      ],
      // Exclude heavy optional dependencies from pre-bundling
      exclude: ['@tensorflow/tfjs']
    },
    // Handle CommonJS dependencies
    define: {
      global: 'globalThis'
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  };
});
