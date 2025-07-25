#!/usr/bin/env node

/**
 * Bundle analyzer script
 * Analyzes the built chunks and provides insights
 */

const fs = require('fs');
const path = require('path');

function analyzeChunks() {
  const distDir = path.join(process.cwd(), 'dist', 'assets', 'js');
  
  if (!fs.existsSync(distDir)) {
    console.log('❌ No build found. Run "npm run build" first.');
    return;
  }

  const files = fs.readdirSync(distDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      
      // Extract chunk name from filename
      const chunkName = file.split('-')[0];
      
      return {
        file,
        chunkName,
        size: stats.size,
        sizeKB,
        type: getChunkType(chunkName)
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('\n📦 Bundle Analysis Results\n');
  
  // Summary by type
  const byType = {};
  let totalSize = 0;
  
  files.forEach(chunk => {
    totalSize += chunk.size;
    if (!byType[chunk.type]) {
      byType[chunk.type] = { count: 0, size: 0 };
    }
    byType[chunk.type].count++;
    byType[chunk.type].size += chunk.size;
  });
  
  console.log('📊 Summary by Type:');
  Object.entries(byType).forEach(([type, data]) => {
    const sizeKB = Math.round(data.size / 1024);
    const percentage = Math.round((data.size / totalSize) * 100);
    console.log(`${getTypeIcon(type)} ${type.padEnd(20)} ${String(data.count).padStart(2)} chunks  ${String(sizeKB).padStart(4)}KB  (${percentage}%)`);
  });
  
  console.log(`\n📏 Total Bundle Size: ${Math.round(totalSize / 1024)}KB`);
  
  console.log('\n📄 Individual Chunks:');
  files.forEach(chunk => {
    const icon = getTypeIcon(chunk.type);
    const name = chunk.chunkName.padEnd(20);
    const size = `${chunk.sizeKB}KB`.padStart(6);
    console.log(`${icon} ${name} ${size}`);
  });
  
  // Performance insights
  console.log('\n⚡ Performance Insights:');
  
  const criticalChunks = files.filter(c => c.type === 'Critical');
  const criticalSize = criticalChunks.reduce((sum, c) => sum + c.size, 0);
  console.log(`🎯 Critical path size: ${Math.round(criticalSize / 1024)}KB`);
  
  const lazyChunks = files.filter(c => c.type === 'Lazy');
  const lazySize = lazyChunks.reduce((sum, c) => sum + c.size, 0);
  console.log(`🚀 Lazy-loaded savings: ${Math.round(lazySize / 1024)}KB`);
  
  const routeChunks = files.filter(c => c.type === 'Route');
  console.log(`📍 Route chunks: ${routeChunks.length} (${Math.round(routeChunks.reduce((sum, c) => sum + c.size, 0) / 1024)}KB)`);
  
  console.log('\n💡 Recommendations:');
  
  const largeChunks = files.filter(c => c.sizeKB > 300);
  if (largeChunks.length > 0) {
    console.log(`⚠️  Large chunks detected: ${largeChunks.map(c => c.chunkName).join(', ')}`);
    console.log('   Consider further splitting or lazy loading');
  }
  
  if (criticalSize > 500 * 1024) {
    console.log('⚠️  Critical path is large (>500KB)');
    console.log('   Consider moving non-essential code to lazy chunks');
  } else {
    console.log('✅ Critical path size is optimized');
  }
  
  console.log('');
}

function getChunkType(chunkName) {
  if (['vendor-react', 'vendor-data', 'main', 'index'].includes(chunkName)) {
    return 'Critical';
  }
  if (chunkName.startsWith('vendor-ui')) {
    return 'UI Core';
  }
  if (chunkName.startsWith('vendor-')) {
    if (['vendor-maps', 'vendor-ai', 'vendor-export', 'vendor-charts'].includes(chunkName)) {
      return 'Lazy';
    }
    return 'Vendor';
  }
  if (chunkName.startsWith('route-')) {
    return 'Route';
  }
  if (chunkName.startsWith('feature-')) {
    return 'Feature';
  }
  return 'Other';
}

function getTypeIcon(type) {
  const icons = {
    'Critical': '🎯',
    'UI Core': '🎨',
    'Vendor': '📦',
    'Lazy': '🚀',
    'Route': '📍',
    'Feature': '⚙️',
    'Other': '📄'
  };
  return icons[type] || '📄';
}

// Run analysis
analyzeChunks();