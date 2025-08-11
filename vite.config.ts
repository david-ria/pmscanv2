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
    // Clear cache to prevent phantom chunk issues
    cacheDir: 'node_modules/.vite',
    build: {
      // Clear any previous build artifacts to prevent ghost chunks
      emptyOutDir: true,
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
          // Simplified chunk configuration to prevent phantom chunks
          manualChunks: (id) => {
            // Vendor chunk for core libraries
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('mapbox-gl')) {
                return 'mapbox';
              }
              if (id.includes('@tensorflow')) {
                return 'tensorflow';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('react-router')) {
                return 'router';
              }
              return 'vendor';
            }
            
            // Application chunks
            if (id.includes('src/pages/')) {
              const pageName = id.split('/pages/')[1].split('.')[0].toLowerCase();
              return `page-${pageName}`;
            }
            
            if (id.includes('src/components/MapboxMap/')) {
              return 'map-components';
            }
            
            if (id.includes('src/components/Analysis/')) {
              return 'analysis-components';
            }
            
            if (id.includes('src/lib/pmscan/')) {
              return 'bluetooth';
            }
            
            // Default chunk for other modules
            return 'main';
          },
        },
        // Exclude problematic externals that might cause phantom chunks
        external: (id) => {
          // Don't externalize anything unless specifically needed
          return false;
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
      // Force rebuilding of all chunks
      watch: null,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  };
});
