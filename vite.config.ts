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
      // Force clean build by clearing rollup cache
      rollupOptions: {
        // Prevent phantom chunks by being more conservative with chunking
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
        },
        output: {
          // Stable naming to prevent phantom chunks
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
          // Conservative chunk strategy to prevent phantom chunks
          manualChunks: (id) => {
            // Only chunk vendor libraries to reduce phantom chunk risk
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              if (id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('mapbox-gl')) {
                return 'mapbox';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              // Group other vendors together to prevent fragmentation
              return 'vendor';
            }
            // Don't manually chunk application code - let Vite handle it
            return undefined;
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
