# Performance Test Suite

This project includes a comprehensive performance regression detection system that monitors Web Vitals, bundle sizes, and runtime performance.

## Overview

The performance suite consists of three main components:

1. **Lighthouse Audits** - Web Vitals and performance metrics
2. **Bundle Size Monitoring** - JavaScript bundle size tracking and regression detection  
3. **Runtime Performance Tests** - Route navigation, network budgets, and code-splitting verification

## Performance Budgets

### Web Vitals (Lighthouse)
- **LCP (Largest Contentful Paint)**: ≤ 2.5s
- **CLS (Cumulative Layout Shift)**: ≤ 0.1
- **TTI (Time to Interactive)**: ≤ 3.5s
- **Speed Index**: ≤ 3.0s
- **FID (First Input Delay)**: ≤ 100ms

### Network & Bundle Budgets
- **Total Transfer Size**: ≤ 1.2 MB
- **Network Requests**: ≤ 35 requests
- **JavaScript Execution Time**: ≤ 1.5s
- **Total JS Bundle (gzipped)**: ≤ 450 KB
- **Individual Chunk Size**: ≤ 200 KB
- **Chunk Growth Threshold**: ≤ 10% increase

### Runtime Performance
- **Long Tasks**: 0 tasks > 250ms during route changes
- **Third-party Requests**: 0 external domains
- **Code Splitting**: Dynamic imports required for route navigation

## Running Tests Locally

### Full Performance Suite
```bash
# Build and run all performance tests
npm run build
npm run test:performance
```

### Individual Components

#### Lighthouse Audits
```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli

# Run Lighthouse on all routes
lhci autorun

# Check results against budgets
node scripts/lighthouse-budget-check.js
```

#### Bundle Size Analysis
```bash
# Build and analyze bundle
npm run build
node scripts/bundle-size-check.js

# Create/update baseline
node scripts/bundle-size-check.js --approve-budgets
```

#### Runtime Performance Tests
```bash
# Run Playwright performance tests
npx playwright test tests/performance-budgets.spec.ts
```

## CI/CD Integration

The performance suite runs automatically in CI on every pull request and push to main:

1. **Build Optimization**: Application is built with production optimizations
2. **Lighthouse Audits**: Tests /, /auth, and /history routes
3. **Bundle Analysis**: Compares current build against baseline
4. **Runtime Tests**: Validates network budgets and code-splitting
5. **Artifact Upload**: Saves reports for analysis

### Updating Baselines

When performance characteristics change intentionally (e.g., adding new features), you may need to update baselines:

```bash
# Update bundle size baseline
npm run build
node scripts/bundle-size-check.js --approve-budgets

# Commit the updated baseline
git add perf-report/bundle-baseline.json
git commit -m "Update performance baseline"
```

## Performance Reports

All performance reports are saved to the `perf-report/` directory:

- `bundle-baseline.json` - Bundle size baseline for regression detection
- `bundle-report.json` - Current build bundle analysis
- `.lighthouseci/` - Lighthouse audit reports (JSON + HTML)

## Monitoring & Alerts

### Bundle Size Regression Detection
- Tracks individual chunk sizes and total bundle size
- Alerts when any chunk grows by >10% 
- Prevents total JS bundle from exceeding 450KB (gzipped)

### Performance Regression Detection  
- Monitors Core Web Vitals across all routes
- Tracks network request counts and transfer sizes
- Detects long tasks during route navigation
- Ensures code-splitting is working correctly

### Third-party Dependency Monitoring
- Blocks any requests to external domains during testing
- Ensures all dependencies are bundled or loaded from localhost
- Prevents performance degradation from external services

## Optimization Strategies

When performance budgets are exceeded, consider these optimization strategies:

### Bundle Size Optimization
- Use dynamic imports for large dependencies
- Remove unused dependencies and dead code
- Enable tree-shaking for all libraries
- Split vendor code into separate chunks
- Replace large libraries with smaller alternatives

### Runtime Performance Optimization
- Implement lazy loading for non-critical components
- Use React.memo() and useMemo() for expensive computations
- Optimize re-renders with proper dependency arrays
- Move heavy calculations to Web Workers

### Network Performance Optimization
- Enable compression (gzip/brotli) for all text assets
- Implement proper caching strategies
- Use a CDN for static assets
- Optimize images and use modern formats (WebP, AVIF)

## Debugging Performance Issues

### Analyzing Bundle Size
```bash
# Generate detailed bundle analysis
ANALYZE=true npm run build

# Open the interactive bundle analyzer
open dist/bundle-analysis.html
```

### Lighthouse Performance Debugging
```bash
# Run Lighthouse with detailed reporting
lhci autorun --upload.target=temporary-public-storage
```

### Network Analysis
```bash
# Run performance tests with network logging
DEBUG=pw:api npx playwright test tests/performance-budgets.spec.ts
```

## Best Practices

1. **Monitor Regularly**: Check performance metrics on every deployment
2. **Set Realistic Budgets**: Balance performance with feature requirements
3. **Test Real Conditions**: Use throttled networks and slower devices
4. **Prioritize Critical Path**: Optimize above-the-fold content first
5. **Measure User Impact**: Focus on metrics that affect user experience

## Integration with Development Workflow

- **Pre-commit**: Bundle size analysis runs automatically
- **PR Checks**: Full performance suite validates changes
- **Main Branch**: Performance baselines are updated automatically
- **Releases**: Performance reports are archived as artifacts

For detailed technical implementation, see the source files:
- `scripts/lighthouse-budget-check.js`
- `scripts/bundle-size-check.js` 
- `tests/performance-budgets.spec.ts`
- `lighthouserc.js`