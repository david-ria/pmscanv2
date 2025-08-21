#!/usr/bin/env node

/**
 * Bundle size monitoring and regression detection
 * Tracks total bundle size and individual chunk growth
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

const BUNDLE_BUDGETS = {
  totalJSGzipped: 450 * 1024, // 450 KB gzipped
  chunkGrowthThreshold: 0.1, // 10% growth threshold
  maxChunkSize: 200 * 1024, // 200 KB per chunk
};

const BASELINE_FILE = 'perf-report/bundle-baseline.json';
const REPORT_DIR = 'perf-report';

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getGzippedSize(filePath) {
  try {
    const gzipOutput = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf8' });
    return parseInt(gzipOutput.trim());
  } catch (error) {
    console.warn(`⚠️  Could not get gzipped size for ${filePath}`);
    return fs.statSync(filePath).size; // Fallback to uncompressed size
  }
}

function analyzeBundleSize() {
  console.log('📦 Analyzing bundle sizes...');
  
  const distDir = 'dist';
  if (!fs.existsSync(distDir)) {
    console.error('❌ Dist directory not found. Run npm run build first.');
    process.exit(1);
  }

  // Find all JS files in dist
  const jsFiles = glob.sync('dist/**/*.js');
  const currentSizes = {};
  let totalJSSize = 0;
  let totalJSGzipped = 0;

  jsFiles.forEach(filePath => {
    const stats = fs.statSync(filePath);
    const gzippedSize = getGzippedSize(filePath);
    const relativePath = path.relative('dist', filePath);
    
    currentSizes[relativePath] = {
      raw: stats.size,
      gzipped: gzippedSize
    };
    
    totalJSSize += stats.size;
    totalJSGzipped += gzippedSize;
  });

  const currentReport = {
    timestamp: new Date().toISOString(),
    totalJSSize,
    totalJSGzipped,
    files: currentSizes
  };

  // Ensure report directory exists
  ensureDirectoryExists(REPORT_DIR);

  // Load baseline if it exists
  let baseline = null;
  if (fs.existsSync(BASELINE_FILE)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Could not parse baseline file');
    }
  }

  // Check budgets
  let budgetViolations = [];
  let regressions = [];

  // Check total JS size budget
  if (totalJSGzipped > BUNDLE_BUDGETS.totalJSGzipped) {
    budgetViolations.push({
      type: 'total-size',
      current: totalJSGzipped,
      budget: BUNDLE_BUDGETS.totalJSGzipped,
      overage: totalJSGzipped - BUNDLE_BUDGETS.totalJSGzipped
    });
  }

  // Check individual chunk sizes and growth
  Object.entries(currentSizes).forEach(([file, sizes]) => {
    // Check individual chunk size budget
    if (sizes.gzipped > BUNDLE_BUDGETS.maxChunkSize) {
      budgetViolations.push({
        type: 'chunk-size',
        file,
        current: sizes.gzipped,
        budget: BUNDLE_BUDGETS.maxChunkSize,
        overage: sizes.gzipped - BUNDLE_BUDGETS.maxChunkSize
      });
    }

    // Check growth against baseline
    if (baseline && baseline.files[file]) {
      const baselineSize = baseline.files[file].gzipped;
      const growthRatio = (sizes.gzipped - baselineSize) / baselineSize;
      
      if (growthRatio > BUNDLE_BUDGETS.chunkGrowthThreshold) {
        regressions.push({
          file,
          baseline: baselineSize,
          current: sizes.gzipped,
          growth: growthRatio,
          growthBytes: sizes.gzipped - baselineSize
        });
      }
    }
  });

  // Report results
  console.log('\n' + '='.repeat(60));
  console.log('📋 BUNDLE SIZE ANALYSIS');
  console.log('='.repeat(60));

  console.log(`\n📊 Current Bundle Stats:`);
  console.log(`   • Total JS (raw): ${(totalJSSize / 1024).toFixed(1)} KB`);
  console.log(`   • Total JS (gzipped): ${(totalJSGzipped / 1024).toFixed(1)} KB / ${(BUNDLE_BUDGETS.totalJSGzipped / 1024).toFixed(1)} KB`);
  console.log(`   • Number of chunks: ${Object.keys(currentSizes).length}`);

  if (baseline) {
    const totalGrowth = totalJSGzipped - baseline.totalJSGzipped;
    const growthPercent = (totalGrowth / baseline.totalJSGzipped) * 100;
    console.log(`   • Size change: ${totalGrowth >= 0 ? '+' : ''}${(totalGrowth / 1024).toFixed(1)} KB (${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%)`);
  }

  // Show largest files
  const sortedFiles = Object.entries(currentSizes)
    .sort(([,a], [,b]) => b.gzipped - a.gzipped)
    .slice(0, 5);

  console.log(`\n🏆 Largest Chunks:`);
  sortedFiles.forEach(([file, sizes]) => {
    console.log(`   • ${file}: ${(sizes.gzipped / 1024).toFixed(1)} KB (gzipped)`);
  });

  // Report violations and regressions
  let hasFailures = false;

  if (budgetViolations.length > 0) {
    hasFailures = true;
    console.log(`\n❌ Budget Violations (${budgetViolations.length}):`);
    budgetViolations.forEach(v => {
      if (v.type === 'total-size') {
        console.log(`   • Total JS size: ${(v.current / 1024).toFixed(1)} KB > ${(v.budget / 1024).toFixed(1)} KB (+${(v.overage / 1024).toFixed(1)} KB)`);
      } else if (v.type === 'chunk-size') {
        console.log(`   • ${v.file}: ${(v.current / 1024).toFixed(1)} KB > ${(v.budget / 1024).toFixed(1)} KB (+${(v.overage / 1024).toFixed(1)} KB)`);
      }
    });
  }

  if (regressions.length > 0) {
    hasFailures = true;
    console.log(`\n📈 Size Regressions (${regressions.length}):`);
    regressions.forEach(r => {
      console.log(`   • ${r.file}: ${(r.baseline / 1024).toFixed(1)} KB → ${(r.current / 1024).toFixed(1)} KB (+${(r.growth * 100).toFixed(1)}%, +${(r.growthBytes / 1024).toFixed(1)} KB)`);
    });
  }

  if (!hasFailures) {
    console.log('\n✅ All bundle size budgets passed!');
  }

  // Save current report
  const reportFile = path.join(REPORT_DIR, 'bundle-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(currentReport, null, 2));
  console.log(`\n📄 Report saved to ${reportFile}`);

  // Handle baseline update
  const shouldApprove = process.argv.includes('--approve-budgets');
  if (shouldApprove) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(currentReport, null, 2));
    console.log(`✅ Baseline updated: ${BASELINE_FILE}`);
  } else if (!baseline) {
    console.log(`\n💡 No baseline found. Run with --approve-budgets to create initial baseline.`);
  } else if (hasFailures) {
    console.log(`\n💡 To accept these changes as new baseline, run:`);
    console.log(`   npm run bundle:check -- --approve-budgets`);
  }

  if (hasFailures && !shouldApprove) {
    console.log('\n💡 Bundle optimization suggestions:');
    console.log('   • Use dynamic imports for large dependencies');
    console.log('   • Remove unused dependencies and code');
    console.log('   • Enable tree-shaking for libraries');
    console.log('   • Split vendor code into separate chunks');
    console.log('   • Use smaller alternative libraries');
    
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeBundleSize();
}

module.exports = { analyzeBundleSize };