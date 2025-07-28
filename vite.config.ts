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
          manualChunks: {
            // Stable vendor chunks with long-term caching
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            
            // Heavy backend libraries - rarely change, cache forever
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-mapbox': ['mapbox-gl'],
            'vendor-tensorflow': ['@tensorflow/tfjs'],
            
            // Large UI library vendors - cache for long periods
            'vendor-radix': [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-select', 
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
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
            
            // Form and validation libraries
            'vendor-forms': [
              '@radix-ui/react-checkbox',
              '@radix-ui/react-radio-group',
              '@radix-ui/react-switch',
              '@radix-ui/react-slider',
              '@radix-ui/react-label',
              'react-hook-form',
              '@hookform/resolvers',
              'zod'
            ],
            
            // Utility vendors - very stable
            'vendor-utils': [
              'clsx', 
              'class-variance-authority', 
              'tailwind-merge',
              'date-fns',
              'lucide-react'
            ],
            
            // Feature-specific vendors
            'vendor-charts': ['recharts'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-theme': ['next-themes'],
            'vendor-carousel': ['embla-carousel-react'],
            'vendor-notifications': ['sonner'],
            'vendor-pdf': ['jspdf', 'html2canvas'],
            'vendor-bluetooth': ['@capacitor-community/bluetooth-le'],
          },
        },
      },
      // Optimize assets for caching and TTFB
      assetsInlineLimit: 4096, // Inline small assets as base64
      cssCodeSplit: true, // Split CSS into separate files with hashes
      sourcemap: false, // Disable source maps in production for better performance
      // Enable compression and minification
      minify: 'esbuild',
      // Target modern browsers for better optimization
      target: 'es2022',
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
