import { injectManifest } from 'workbox-build';
import { existsSync } from 'node:fs';

// Adjust outputDir if your build emits to "build" instead of "dist"
const outputDir = existsSync('dist') ? 'dist' : 'build';

const { count, size, warnings } = await injectManifest({
  swSrc: 'src/sw.ts',
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