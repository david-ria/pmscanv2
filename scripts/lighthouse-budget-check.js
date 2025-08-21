#!/usr/bin/env node

/**
 * Custom Lighthouse budget validation script
 * Ensures strict enforcement of performance budgets
 */

const fs = require('fs');
const path = require('path');

const BUDGETS = {
  'largest-contentful-paint': { max: 2500, unit: 'ms', name: 'LCP' },
  'cumulative-layout-shift': { max: 0.1, unit: '', name: 'CLS' },
  'max-potential-fid': { max: 100, unit: 'ms', name: 'Interaction Delay' },
  'total-byte-weight': { max: 512000, unit: 'bytes', name: 'Total Bundle Size' }
};

function checkLighthouseResults() {
  console.log('🔍 Checking Lighthouse performance budgets...');
  
  const resultsDir = '.lighthouseci';
  if (!fs.existsSync(resultsDir)) {
    console.error('❌ Lighthouse results directory not found');
    process.exit(1);
  }
  
  // Find the latest results
  const files = fs.readdirSync(resultsDir);
  const reportFiles = files.filter(f => f.startsWith('lhr-') && f.endsWith('.json'));
  
  if (reportFiles.length === 0) {
    console.error('❌ No Lighthouse reports found');
    process.exit(1);
  }
  
  let allPassed = true;
  const violations = [];
  
  reportFiles.forEach((file, index) => {
    console.log(`\n📊 Analyzing run ${index + 1}: ${file}`);
    
    const reportPath = path.join(resultsDir, file);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    // Check each budget
    Object.entries(BUDGETS).forEach(([metric, budget]) => {
      const audit = report.audits[metric];
      if (!audit) {
        console.warn(`⚠️  Metric ${metric} not found in report`);
        return;
      }
      
      const value = audit.numericValue || 0;
      const passed = value <= budget.max;
      
      if (passed) {
        console.log(`✅ ${budget.name}: ${value.toFixed(2)}${budget.unit} (limit: ${budget.max}${budget.unit})`);
      } else {
        console.log(`❌ ${budget.name}: ${value.toFixed(2)}${budget.unit} (limit: ${budget.max}${budget.unit}) - EXCEEDED!`);
        violations.push({
          metric: budget.name,
          value: value.toFixed(2),
          limit: budget.max,
          unit: budget.unit,
          run: index + 1
        });
        allPassed = false;
      }
    });
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 PERFORMANCE BUDGET SUMMARY');
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('✅ All performance budgets passed!');
    
    // Show performance summary
    const lastReport = JSON.parse(fs.readFileSync(
      path.join(resultsDir, reportFiles[reportFiles.length - 1]), 
      'utf8'
    ));
    
    console.log('\n📈 Performance Score:', Math.round(lastReport.categories.performance.score * 100));
    console.log('📱 Best Practices Score:', Math.round(lastReport.categories['best-practices'].score * 100));
    console.log('♿ Accessibility Score:', Math.round(lastReport.categories.accessibility.score * 100));
    console.log('🔍 SEO Score:', Math.round(lastReport.categories.seo.score * 100));
    
  } else {
    console.log(`❌ ${violations.length} budget violation(s) found:`);
    violations.forEach(v => {
      console.log(`   • ${v.metric}: ${v.value}${v.unit} > ${v.limit}${v.unit} (Run ${v.run})`);
    });
    
    console.log('\n💡 Performance optimization suggestions:');
    console.log('   • Use code splitting to reduce initial bundle size');
    console.log('   • Optimize images and use modern formats (WebP, AVIF)');
    console.log('   • Implement lazy loading for non-critical resources');
    console.log('   • Remove unused CSS and JavaScript');
    console.log('   • Use a CDN for static assets');
    
    process.exit(1);
  }
}

if (require.main === module) {
  checkLighthouseResults();
}

module.exports = { checkLighthouseResults };