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
        external: (id) => {
          // Don't externalize React - it needs to be bundled properly
          return false;
        },
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
            // Simplified chunking to avoid React initialization issues
            if (id.includes('node_modules')) {
              const module = id.split('node_modules/')[1].split('/')[0];
              
              // 1. Core React ecosystem - Keep together to avoid initialization issues
              if (['react', 'react-dom', 'react-router-dom', 'react-hook-form', '@hookform/resolvers'].includes(module)) {
                return 'vendor-react';
              }
              
              // 2. Data & State management
              if (['@tanstack', '@supabase', 'zod'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-data';
              }
              
              // 3. UI Components - Radix UI
              if (module.startsWith('@radix-ui/')) {
                return 'vendor-ui';
              }
              
              // 4. Charts & Visualization
              if (['recharts'].includes(module)) {
                return 'vendor-charts';
              }
              
              // 5. Maps
              if (['mapbox-gl'].includes(module)) {
                return 'vendor-maps';
              }
              
              // 6. AI/ML
              if (['@tensorflow'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-ai';
              }
              
              // 7. Export utilities
              if (['jspdf', 'html2canvas'].includes(module)) {
                return 'vendor-export';
              }
              
              // 8. Hardware/Bluetooth
              if (['@capacitor'].some(pkg => module.startsWith(pkg))) {
                return 'vendor-hardware';
              }
              
              // 9. Utilities
              if (['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge', 'lucide-react'].includes(module)) {
                return 'vendor-utils';
              }
              
              // 10. i18n
              if (['i18next', 'react-i18next', 'i18next-browser-languagedetector'].includes(module)) {
                return 'vendor-i18n';
              }
              
              // 11. Theme & UI enhancements
              if (['next-themes', 'sonner', 'vaul', 'embla-carousel-react', 'cmdk', 'input-otp'].includes(module)) {
                return 'vendor-theme';
              }
              
              // 12. Everything else
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
