import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import type { PluginOption } from 'vite';
import type { PreRenderedAsset } from 'rollup';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const plugins: PluginOption[] = [react()];

  // Add production log removal plugin
  if (isProduction) {
    plugins.push({
      name: 'remove-dev-logs',
      transform(code: string, id: string) {
        if (id.includes('node_modules') || (!id.includes('.ts') && !id.includes('.js'))) {
          return null;
        }
        // Remove development-only logging in production - more precise patterns
        let transformedCode = code
          .replace(/logger\.devLogger\.(debug|info)\([^;]*\);?\s*/g, '')
          .replace(/logger\.rateLimitedDebug\([^;]*\);?\s*/g, '')
          .replace(/console\.debug\([^;]*\);?\s*/g, '')
          .replace(/console\.log\([^;]*\);?\s*/g, ''); // More precise regex
        
        return transformedCode !== code ? transformedCode : null;
      },
    });
  }

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
          manualChunks: {
            // Core vendor chunk - always needed
            vendor: ['react', 'react-dom'],
            
            // Router chunk - needed for navigation
            router: ['react-router-dom'],
            
            // React Query for data fetching
            query: ['@tanstack/react-query'],
            
            // UI library chunks - split by usage frequency
            'ui-core': [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-select', 
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover'
            ],
            'ui-forms': [
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-switch',
              '@radix-ui/react-slider',
              '@radix-ui/react-label',
              'react-hook-form',
              '@hookform/resolvers',
              'zod'
            ],
            'ui-advanced': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-navigation-menu',
              '@radix-ui/react-menubar',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-separator',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group'
            ],
            
            // Feature-specific chunks
            charts: ['recharts'],
            mapbox: ['mapbox-gl'],
            supabase: ['@supabase/supabase-js'],
            
            // Utility chunks
            utils: ['clsx', 'class-variance-authority', 'tailwind-merge'],
            date: ['date-fns'],
            i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            
            // Heavy feature chunks
            bluetooth: ['@capacitor-community/bluetooth-le'],
            tensorflow: ['@tensorflow/tfjs'],
            pdf: ['jspdf', 'html2canvas'],
            
            // Theme and styling
            theme: ['next-themes'],
            carousel: ['embla-carousel-react'],
            notifications: ['sonner'],
            
            // Split by route to enable route-based code splitting
            'route-analysis': [],
            'route-groups': [],
            'route-settings': [],
          },
        },
      },
      // Optimize assets for caching and TTFB
      assetsInlineLimit: 4096, // Inline small assets as base64
      cssCodeSplit: true, // Split CSS into separate files with hashes
      sourcemap: false, // Disable source maps in production for better performance
      // Enable compression and minification
      minify: isProduction ? 'terser' : 'esbuild',
      ...(isProduction && {
        terserOptions: {
          compress: {
            drop_console: ['log', 'debug'],
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.debug', 'logger.devLogger.debug', 'logger.devLogger.info', 'logger.rateLimitedDebug'],
          },
        },
      }),
      // Target modern browsers for better optimization  
      target: 'esnext',
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  };
});
