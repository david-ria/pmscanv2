// Temporary no-op: Service Worker injection disabled to stabilize builds
// Re-enable by running with FORCE_SW_INJECT=1
const FORCE = process.env.FORCE_SW_INJECT === '1';

if (!FORCE) {
  console.log('[SW] Workbox injection disabled (temporary). To enable, run: FORCE_SW_INJECT=1 node scripts/inject-sw.mjs');
  process.exit(0);
}

const { existsSync } = await import('node:fs');
const { injectManifest } = await import('workbox-build');

// Adjust outputDir if your build emits to "build" instead of "dist"
const outputDir = existsSync('dist') ? 'dist' : 'build';

const { count, size, warnings } = await injectManifest({
  swSrc: 'src/sw.js',
  swDest: `${outputDir}/sw.js`,
  globDirectory: outputDir,
  globPatterns: [
    '**/*.{html,js,css,woff2,png,svg,ico,json}',
    'offline.html', // Ensure offline fallback is always included
    'manifest.webmanifest'
  ],
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // 8MB
});

warnings.forEach(w => console.warn(w));
console.log(`Workbox injected ${count} files, total ${size} bytes`);