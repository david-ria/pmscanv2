# Bundle Optimization Guide

## Current Optimizations Implemented

### 1. Dynamic Imports (Code Splitting)
- ✅ Mapbox GL (~2MB) - Lazy loaded
- ✅ Recharts (~1MB + lodash) - Lazy loaded with optimized individual imports
- ✅ TensorFlow (~4MB) - Lazy loaded
- ✅ Supabase client (~500KB) - Lazy loaded
- ✅ PDF libraries (jsPDF + html2canvas) - Lazy loaded
- ✅ Date utilities (date-fns) - Individual function imports
- ✅ Form validation (react-hook-form + zod) - Lazy loaded
- ✅ Bluetooth LE - Lazy loaded

### 2. Bundle Analysis

To analyze your bundle size, run:
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Analyze production bundle
ANALYZE=true npm run build

# This will generate dist/bundle-analysis.html
```

### 3. Individual Library Imports

Instead of importing entire libraries, we now use individual imports:

#### Date-fns (Before: ~300KB, After: ~50KB)
```typescript
// ❌ Before: Imports entire library
import * as dateFns from 'date-fns';

// ✅ After: Individual function imports
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
```

#### Recharts (Optimized component imports)
```typescript
// ❌ Before: Imports entire recharts library + lodash
import { LineChart, XAxis } from 'recharts';

// ✅ After: Optimized dynamic imports in loadChartLibrary()
const { LineChart, XAxis } = await loadChartLibrary();
```

### 4. Lodash Elimination

✅ **Lodash is NOT directly imported** in our codebase
- Only used as dependency by recharts library
- Recharts usage is already optimized with dynamic imports
- No direct lodash imports found to replace

### 5. Bundle Splitting Strategy

Large dependencies (>50KB) that are now optimized:
- 🎯 **TensorFlow.js** (~4MB) → Lazy loaded
- 🎯 **Mapbox GL** (~2MB) → Lazy loaded
- 🎯 **Recharts + Lodash** (~1MB) → Lazy loaded
- 🎯 **Supabase** (~500KB) → Lazy loaded
- 🎯 **Date-fns** (~300KB) → Individual imports (~50KB)
- 🎯 **jsPDF + html2canvas** (~400KB) → Lazy loaded

### 6. Web Workers for CPU-Heavy Tasks

✅ CPU-intensive operations moved to web workers:
- Sensor data parsing
- Statistical calculations
- Chart data aggregation
- WHO compliance calculations

## Performance Monitoring

Use the bundle analyzer to monitor:
```bash
npm run build:analyze
```

Key metrics to watch:
- **Initial bundle size** < 500KB (gzipped)
- **Largest chunk** < 200KB
- **Vendor chunks** properly split
- **Dynamic imports** loading on demand

## Next Steps

1. Monitor bundle size with each deployment
2. Consider removing unused UI components
3. Implement progressive loading for images
4. Use service worker for caching strategies

## Development vs Production

- **Development**: Source maps enabled, console logs preserved
- **Production**: Console logs removed, aggressive minification