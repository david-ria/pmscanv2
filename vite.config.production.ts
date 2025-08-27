import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// Production-specific configuration with log removal
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // Custom plugin to remove development logs in production
    {
      name: 'remove-dev-logs',
      transform(code, id) {
        if (id.includes('node_modules') || !id.includes('.ts') && !id.includes('.js')) {
          return null;
        }
        // Remove logger calls in production
        let transformedCode = code
          .replace(/logger\.devLogger\.(debug|info)\([^)]*\);?/g, '')
          .replace(/logger\.rateLimitedDebug\([^)]*\);?/g, '')
          .replace(/console\.debug\([^)]*\);?/g, '')
          .replace(/console\.log\([^)]*\);?/g, '');
        
        // Only return if changes were made
        return transformedCode !== code ? transformedCode : null;
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console statements in production
        drop_console: ['log', 'debug'],
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'logger.devLogger.debug', 'logger.devLogger.info', 'logger.rateLimitedDebug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-button'],
        },
      },
    },
  },
  define: {
    // Ensure NODE_ENV is properly set
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});