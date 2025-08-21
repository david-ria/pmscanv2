import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from '@axe-core/playwright';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Accessibility Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup network isolation for offline testing
    await setupNetworkIsolation(page);
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('should have no serious/critical a11y violations on auth page', async ({ page }) => {
    await page.goto('/?e2e=1');
    
    // Navigate to auth page
    await page.goto('/auth?e2e=1');
    
    // Wait for page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Check accessibility with axe-core
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical', 'serious']
    });
    
    // Get violations for detailed logging
    const violations = await getViolations(page, null, {
      includedImpacts: ['critical', 'serious']
    });
    
    if (violations.length > 0) {
      console.log('🚨 A11Y VIOLATIONS ON /auth:');
      violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. Rule: ${violation.id}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help URL: ${violation.helpUrl}`);
        console.log(`   Nodes: ${violation.nodes.length}`);
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`     ${nodeIndex + 1}. Target: ${node.target.join(', ')}`);
          console.log(`        HTML: ${node.html.substring(0, 100)}...`);
        });
      });
    }
    
    expect(violations).toHaveLength(0);
  });

  test('should have no serious/critical a11y violations on dashboard page', async ({ page }) => {
    await page.goto('/?e2e=1');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Check accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical', 'serious']
    });
    
    const violations = await getViolations(page, null, {
      includedImpacts: ['critical', 'serious']
    });
    
    if (violations.length > 0) {
      console.log('🚨 A11Y VIOLATIONS ON /:');
      violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. Rule: ${violation.id}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help URL: ${violation.helpUrl}`);
        console.log(`   Nodes: ${violation.nodes.length}`);
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`     ${nodeIndex + 1}. Target: ${node.target.join(', ')}`);
          console.log(`        HTML: ${node.html.substring(0, 100)}...`);
        });
      });
    }
    
    expect(violations).toHaveLength(0);
  });

  test('should have no serious/critical a11y violations on history page', async ({ page }) => {
    await page.goto('/?e2e=1');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Navigate to history page
    await page.click('[data-testid="nav-history"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Check accessibility
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical', 'serious']
    });
    
    const violations = await getViolations(page, null, {
      includedImpacts: ['critical', 'serious']
    });
    
    if (violations.length > 0) {
      console.log('🚨 A11Y VIOLATIONS ON /history:');
      violations.forEach((violation, index) => {
        console.log(`\n${index + 1}. Rule: ${violation.id}`);
        console.log(`   Impact: ${violation.impact}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help URL: ${violation.helpUrl}`);
        console.log(`   Nodes: ${violation.nodes.length}`);
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`     ${nodeIndex + 1}. Target: ${node.target.join(', ')}`);
          console.log(`        HTML: ${node.html.substring(0, 100)}...`);
        });
      });
    }
    
    expect(violations).toHaveLength(0);
  });

  test('should run complete accessibility audit and generate report', async ({ page }) => {
    console.log('🔍 Running complete accessibility audit...');
    
    const routes = [
      { path: '/auth?e2e=1', name: 'Authentication' },
      { path: '/?e2e=1', name: 'Dashboard' },
    ];
    
    const allViolations: any[] = [];
    
    for (const route of routes) {
      await page.goto(route.path);
      
      // Wait for content to load
      if (route.path.includes('/auth')) {
        await page.waitForSelector('h1', { timeout: 10000 });
      } else {
        await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      }
      
      const violations = await getViolations(page, null, {
        includedImpacts: ['critical', 'serious']
      });
      
      if (violations.length > 0) {
        console.log(`\n📍 ${route.name} (${route.path}): ${violations.length} violations`);
        allViolations.push(...violations.map(v => ({ ...v, route: route.name })));
      } else {
        console.log(`\n✅ ${route.name} (${route.path}): No serious/critical violations`);
      }
    }
    
    // Navigate to history and test it separately due to routing
    await page.goto('/?e2e=1');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    await page.click('[data-testid="nav-history"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const historyViolations = await getViolations(page, null, {
      includedImpacts: ['critical', 'serious']
    });
    
    if (historyViolations.length > 0) {
      console.log(`\n📍 History (/history): ${historyViolations.length} violations`);
      allViolations.push(...historyViolations.map(v => ({ ...v, route: 'History' })));
    } else {
      console.log(`\n✅ History (/history): No serious/critical violations`);
    }
    
    if (allViolations.length > 0) {
      console.log(`\n🚨 TOTAL VIOLATIONS FOUND: ${allViolations.length}`);
      console.log('\n📋 VIOLATION SUMMARY:');
      
      const violationsByRule = allViolations.reduce((acc, violation) => {
        const key = violation.id;
        if (!acc[key]) {
          acc[key] = {
            rule: violation.id,
            impact: violation.impact,
            description: violation.description,
            helpUrl: violation.helpUrl,
            routes: new Set(),
            count: 0
          };
        }
        acc[key].routes.add(violation.route);
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);
      
      Object.values(violationsByRule).forEach((violation: any, index) => {
        console.log(`\n${index + 1}. ${violation.rule} (${violation.impact})`);
        console.log(`   Affected routes: ${Array.from(violation.routes).join(', ')}`);
        console.log(`   Total occurrences: ${violation.count}`);
        console.log(`   Description: ${violation.description}`);
        console.log(`   Help: ${violation.helpUrl}`);
      });
    }
    
    console.log(`\n🎯 Accessibility audit complete. Total violations: ${allViolations.length}`);
    expect(allViolations).toHaveLength(0);
  });
});