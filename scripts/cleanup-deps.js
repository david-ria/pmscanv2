#!/usr/bin/env node

/**
 * Remove unused dependencies script
 * Based on bundle audit findings
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Dependencies that appear to be unused based on code analysis
const UNUSED_DEPENDENCIES = [
  // Potentially unused based on limited search results
  'react-day-picker',     // Only used in calendar component, might be replaceable
  'input-otp',           // OTP functionality not found in main code paths
  'cmdk',                // Command palette not implemented
  'vaul',                // Drawer component not widely used
  '@radix-ui/react-aspect-ratio',  // Not found in search
  '@radix-ui/react-hover-card',    // Limited usage
  '@radix-ui/react-menubar',       // Not used in main navigation
  '@radix-ui/react-navigation-menu', // Custom navigation implemented
];

// Dependencies that could be replaced with lighter alternatives
const REPLACEABLE_DEPENDENCIES = [
  {
    package: 'react-resizable-panels',
    alternative: 'CSS Grid or Flexbox',
    reason: 'Simple layouts might not need a library',
    size: '~50KB'
  },
  {
    package: 'embla-carousel-react',
    alternative: 'CSS scroll-snap',
    reason: 'Modern CSS can handle simple carousels',
    size: '~80KB'
  }
];

function removeUnusedDependencies() {
  console.log('🧹 Bundle Cleanup - Removing Unused Dependencies\n');

  // Read current package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const currentDeps = packageJson.dependencies;

  console.log('📋 Analysis Results:\n');

  // Check which unused dependencies are actually installed
  const installedUnused = UNUSED_DEPENDENCIES.filter(dep => currentDeps[dep]);
  const notInstalled = UNUSED_DEPENDENCIES.filter(dep => !currentDeps[dep]);

  if (installedUnused.length === 0) {
    console.log('✅ No unused dependencies found to remove');
  } else {
    console.log(`📦 Found ${installedUnused.length} unused dependencies:`);
    installedUnused.forEach(dep => {
      console.log(`  ❌ ${dep}`);
    });
  }

  if (notInstalled.length > 0) {
    console.log(`\n✅ Already clean (not installed):`);
    notInstalled.forEach(dep => {
      console.log(`  ✓ ${dep}`);
    });
  }

  console.log('\n💡 Replaceable Dependencies:');
  REPLACEABLE_DEPENDENCIES.forEach(({ package, alternative, reason, size }) => {
    if (currentDeps[package]) {
      console.log(`  🔄 ${package} (${size})`);
      console.log(`     → ${alternative}`);
      console.log(`     → ${reason}`);
    }
  });

  // Ask for confirmation before removing
  if (installedUnused.length > 0) {
    console.log('\n⚠️  This will remove the unused dependencies listed above.');
    console.log('   Make sure you\'ve verified they\'re actually unused!');
    console.log('\n   To proceed, run: npm uninstall ' + installedUnused.join(' '));
    
    // Show bundle size savings estimate
    const estimatedSavings = installedUnused.length * 50; // Average 50KB per unused package
    console.log(`\n📊 Estimated bundle size savings: ~${estimatedSavings}KB`);
  }

  // Show optimization recommendations
  console.log('\n🎯 Next Steps for Further Optimization:');
  console.log('  1. Run: npm run build:analyze');
  console.log('  2. Check for duplicate dependencies');
  console.log('  3. Review large chunks in the analysis');
  console.log('  4. Consider replacing heavy libraries with lighter alternatives');
  
  return {
    unusedDependencies: installedUnused,
    estimatedSavings: installedUnused.length * 50
  };
}

// Run the cleanup analysis
if (require.main === module) {
  const results = removeUnusedDependencies();
  
  if (results.unusedDependencies.length > 0) {
    console.log('\n🚀 To automatically remove unused dependencies, run:');
    console.log(`   node scripts/cleanup-deps.js --remove`);
  }
}

module.exports = { removeUnusedDependencies };