import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import type { PluginOption } from 'vite';
import type { PreRenderedAsset } from 'rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
      // Enable HTTP/2 for development (requires HTTPS setup)
      // https: true, // Can be enabled with SSL certificates
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
      rollupOptions: {
        output: {
          // Enable content-hash filenames for better caching
          assetFileNames: (assetInfo: PreRenderedAsset) => {
            const info = assetInfo.name!.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          manualChunks: (id) => {
            // Extract package name from node_modules path
            if (id.includes('node_modules')) {
              const module = id.split('node_modules/')[1].split('/')[0];
              
              // 1. Core React ecosystem - Most critical, loaded first
              if (['react', 'react-dom', 'react-router-dom'].includes(module)) {
                return 'vendor-react';
              }
              
              // 2. Data fetching & state management - Used across app
              if (['@tanstack', '@supabase'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-data';
              }
              
              // 3. UI Foundation - Radix core components (most used)
              if ([
                '@radix-ui/react-dialog',
                '@radix-ui/react-select', 
                '@radix-ui/react-tabs',
                '@radix-ui/react-toast',
                '@radix-ui/react-tooltip',
                '@radix-ui/react-button',
                '@radix-ui/react-slot'
              ].includes(module)) {
                return 'vendor-ui-core';
              }
              
              // 4. UI Forms - Form-related components
              if ([
                '@radix-ui/react-checkbox',
                '@radix-ui/react-radio-group',
                '@radix-ui/react-switch',
                '@radix-ui/react-slider',
                '@radix-ui/react-label'
              ].includes(module)) {
                return 'vendor-ui-forms';
              }
              
              // 4.5. Form libraries - Separate chunk to avoid React dependency issues
              if ([
                'react-hook-form',
                '@hookform/resolvers',
                'zod'
              ].includes(module)) {
                return 'vendor-form-libs';
              }
              
              // 5. UI Advanced - Less frequently used UI components
              if (module.startsWith('@radix-ui/')) {
                return 'vendor-ui-advanced';
              }
              
              // 6. Charts & Visualization - Large but only for specific routes
              if (['recharts', 'victory-vendor'].includes(module)) {
                return 'vendor-charts';
              }
              
              // 7. Maps - Heavy, loaded on demand
              if (['mapbox-gl'].includes(module)) {
                return 'vendor-maps';
              }
              
              // 8. AI/ML - Very heavy, used sparingly
              if (['@tensorflow'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-ai';
              }
              
              // 9. PDF & Export - Used occasionally
              if (['jspdf', 'html2canvas'].includes(module)) {
                return 'vendor-export';
              }
              
              // 10. Bluetooth & Hardware - Mobile/device specific
              if (['@capacitor'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-hardware';
              }
              
              // 11. Date & Utilities - Lightweight utilities
              if (['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'].includes(module)) {
                return 'vendor-utils';
              }
              
              // 12. Internationalization - Used globally but can be split
              if (['i18next', 'react-i18next', 'i18next-browser-languagedetector'].includes(module)) {
                return 'vendor-i18n';
              }
              
              // 13. Theme & Styling - Small but used globally
              if (['next-themes', 'sonner', 'vaul'].includes(module)) {
                return 'vendor-theme';
              }
              
              // 14. Animation & Interaction - Used for enhanced UX
              if (['embla-carousel-react', 'cmdk', 'input-otp'].includes(module)) {
                return 'vendor-interaction';
              }
              
              // 15. Lucide icons - Used throughout but can be chunked
              if (module === 'lucide-react') {
                return 'vendor-icons';
              }
              
              // 16. Everything else - Fallback for other dependencies
              return 'vendor-misc';
            }
            
            // Application code splitting by route/feature
            if (id.includes('/pages/Analysis')) {
              return 'route-analysis';
            }
            if (id.includes('/pages/Groups')) {
              return 'route-groups';
            }
            if (id.includes('/pages/MySettings') || id.includes('/pages/Profile') || id.includes('/pages/CustomThresholds') || id.includes('/pages/CustomAlerts')) {
              return 'route-settings';
            }
            if (id.includes('/pages/History')) {
              return 'route-history';
            }
            if (id.includes('/pages/RealTime')) {
              return 'route-realtime';
            }
            if (id.includes('/pages/Auth')) {
              return 'route-auth';
            }
            
            // Feature-based splitting
            if (id.includes('/components/MapboxMap') || id.includes('/lib/mapbox')) {
              return 'feature-maps';
            }
            if (id.includes('/components/Analysis') || id.includes('/hooks/useHistoryStats')) {
              return 'feature-analysis';
            }
            if (id.includes('/components/Groups') || id.includes('/hooks/useGroups')) {
              return 'feature-groups';
            }
            if (id.includes('/lib/pmscan') || id.includes('/components/PMScan')) {
              return 'feature-bluetooth';
            }
            if (id.includes('/components/RealTime') || id.includes('/hooks/useWeather') || id.includes('/hooks/useAirQuality')) {
              return 'feature-realtime';
            }
            
            // Return undefined for main chunk
            return undefined;
          },
        },
      },
      // Optimize dependency pre-bundling
      optimizeDeps: {
        include: [
          // Core dependencies that should always be pre-bundled
          'react',
          'react-dom',
          'react-router-dom',
          'clsx',
          'tailwind-merge'
        ],
        exclude: [
          // Heavy dependencies that should remain as separate chunks
          'mapbox-gl',
          'recharts',
          '@tensorflow/tfjs',
          'jspdf',
          'html2canvas',
          '@capacitor-community/bluetooth-le'
        ]
      },
      // Optimize assets for caching and TTFB
      assetsInlineLimit: 4096, // Inline small assets as base64
      cssCodeSplit: true, // Split CSS into separate files with hashes
      sourcemap: false, // Disable source maps in production for better performance
      // Enable compression and minification
      minify: 'esbuild',
      // Target modern browsers for better optimization
      target: 'es2022',
      // Optimize chunk size warnings - higher due to more strategic splitting
      chunkSizeWarningLimit: 800,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  };
});
