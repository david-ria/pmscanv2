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
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select'],
            'chart-vendor': ['recharts'],
            'map-vendor': ['mapbox-gl'],
            'query-vendor': ['@tanstack/react-query'],
            'supabase-vendor': ['@supabase/supabase-js']
          }
        }
      },
      // Enable minification and compression
      minify: 'terser' as const,
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : []
        }
      },
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
        '@supabase/supabase-js'
      ],
      // Exclude heavy optional dependencies from pre-bundling
      exclude: ['@tensorflow/tfjs']
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  };
});
