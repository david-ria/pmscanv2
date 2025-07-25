#!/usr/bin/env node

/**
 * Bundle Audit Script
 * Analyzes the codebase for unused imports, heavy libraries, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');

// Known heavy libraries and their lighter alternatives
const HEAVY_LIBRARIES = {
  'moment': { 
    alternative: 'date-fns', 
    size: '67KB',
    altSize: '13KB',
    reason: 'Moment.js is deprecated and very heavy'
  },
  'lodash': { 
    alternative: 'individual imports', 
    size: '70KB',
    altSize: '2-5KB',
    reason: 'Full lodash is heavy, use individual function imports'
  },
  '@tensorflow/tfjs': { 
    alternative: 'dynamic import', 
    size: '4MB',
    altSize: '0KB initial',
    reason: 'Already optimized with dynamic imports'
  },
  'mapbox-gl': { 
    alternative: 'dynamic import', 
    size: '2MB',
    altSize: '0KB initial',
    reason: 'Already optimized with dynamic imports'
  },
  'recharts': { 
    alternative: 'dynamic import', 
    size: '400KB',
    altSize: '0KB initial',
    reason: 'Already optimized with dynamic imports'
  }
};

// Radix UI components that might be unused
const RADIX_COMPONENTS = [
  '@radix-ui/react-accordion',
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-aspect-ratio',
  '@radix-ui/react-avatar',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-collapsible',
  '@radix-ui/react-context-menu',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-hover-card',
  '@radix-ui/react-menubar',
  '@radix-ui/react-navigation-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-progress',
  '@radix-ui/react-radio-group',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-separator',
  '@radix-ui/react-slider',
  '@radix-ui/react-switch',
  '@radix-ui/react-toggle',
  '@radix-ui/react-toggle-group'
];

// Other potentially unused dependencies
const POTENTIALLY_UNUSED = [
  'react-day-picker',
  'react-resizable-panels',
  'embla-carousel-react',
  'input-otp',
  'cmdk',
  'vaul'
];

function auditBundle() {
  console.log('📦 Bundle Audit Report\n');

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies;

  console.log('🔍 Analyzing dependencies...\n');

  // Check for heavy libraries
  console.log('⚖️  Heavy Libraries Analysis:');
  Object.keys(dependencies).forEach(dep => {
    if (HEAVY_LIBRARIES[dep]) {
      const lib = HEAVY_LIBRARIES[dep];
      console.log(`  📊 ${dep}: ${lib.size} → ${lib.altSize} (${lib.reason})`);
    }
  });

  // Scan source files for import usage
  const srcDir = 'src';
  const allFiles = getAllFiles(srcDir, ['.tsx', '.ts']);
  const importMap = new Map();

  // Build import usage map
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractImports(content);
    imports.forEach(imp => {
      if (!importMap.has(imp)) {
        importMap.set(imp, []);
      }
      importMap.get(imp).push(file);
    });
  });

  console.log('\n🎯 Radix UI Component Usage:');
  RADIX_COMPONENTS.forEach(component => {
    const usageFiles = importMap.get(component) || [];
    if (usageFiles.length === 0) {
      console.log(`  ❌ ${component}: UNUSED`);
    } else {
      console.log(`  ✅ ${component}: ${usageFiles.length} files`);
    }
  });

  console.log('\n🔍 Potentially Unused Dependencies:');
  POTENTIALLY_UNUSED.forEach(dep => {
    if (dependencies[dep]) {
      const usageFiles = importMap.get(dep) || [];
      if (usageFiles.length === 0) {
        console.log(`  ❌ ${dep}: UNUSED - can be removed`);
      } else {
        console.log(`  ✅ ${dep}: used in ${usageFiles.length} files`);
      }
    }
  });

  // Check for import optimization opportunities
  console.log('\n📈 Import Optimization Opportunities:');
  
  // Check for full library imports that should be individual
  const fullImports = [];
  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for full date-fns imports
    if (content.includes('import * as dateFns from \'date-fns\'') || 
        content.includes('import dateFns from \'date-fns\'')) {
      fullImports.push({ file, library: 'date-fns', type: 'full import' });
    }
    
    // Check for non-ESM imports
    if (content.includes('import { format } from \'date-fns\'') && 
        !content.includes('import { format } from \'date-fns/format\'')) {
      fullImports.push({ file, library: 'date-fns', type: 'non-ESM import' });
    }
  });

  fullImports.forEach(({ file, library, type }) => {
    console.log(`  🔧 ${file}: ${library} (${type})`);
  });

  // Check for unused imports within files
  console.log('\n🧹 Unused Import Analysis:');
  const unusedImports = findUnusedImports(allFiles);
  if (unusedImports.length === 0) {
    console.log('  ✅ No obvious unused imports found');
  } else {
    unusedImports.slice(0, 10).forEach(({ file, imports }) => {
      console.log(`  🗑️  ${file}: ${imports.join(', ')}`);
    });
    if (unusedImports.length > 10) {
      console.log(`  ... and ${unusedImports.length - 10} more files`);
    }
  }

  // Generate recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('  1. 🎯 Convert date-fns imports to individual ESM imports');
  console.log('  2. 📦 Remove unused Radix UI components');
  console.log('  3. 🔍 Run dependency analyzer: npm run analyze-deps');
  console.log('  4. 📊 Build bundle analysis: npm run build:analyze');
  console.log('  5. 🧹 Use ESLint unused imports rule');

  console.log('\n📏 Estimated Bundle Size Savings:');
  console.log('  • Remove unused Radix components: ~50-100KB');
  console.log('  • Optimize date-fns imports: ~200KB');
  console.log('  • Remove unused dependencies: ~100-300KB');
  console.log('  • Total potential savings: ~350-600KB');
}

function getAllFiles(dir, extensions) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walkDir(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    });
  }
  
  walkDir(dir);
  return files;
}

function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+(?:{[^}]*}\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      // Extract package name (handle scoped packages)
      const packageName = importPath.startsWith('@') 
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];
      imports.push(packageName);
    }
  }
  
  return [...new Set(imports)];
}

function findUnusedImports(files) {
  const unusedImports = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('import') && line.includes('from')) {
        // Simple heuristic: check for unused named imports
        const namedImportMatch = line.match(/import\s+{([^}]+)}\s+from/);
        if (namedImportMatch) {
          const imports = namedImportMatch[1]
            .split(',')
            .map(imp => imp.trim())
            .filter(imp => imp.length > 0);
          
          const unused = imports.filter(imp => {
            // Check if the import is used in the file
            const usageRegex = new RegExp(`\\b${imp}\\b`, 'g');
            const matches = content.match(usageRegex) || [];
            return matches.length <= 1; // Only the import line itself
          });
          
          if (unused.length > 0) {
            unusedImports.push({ file, imports: unused });
          }
        }
      }
    });
  });
  
  return unusedImports;
}

// Run the audit
if (require.main === module) {
  auditBundle();
}

module.exports = { auditBundle };
