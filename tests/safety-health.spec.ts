import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('Safety - Health Check', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
  });

  test('should serve health.json with valid structure', async ({ page }) => {
    // Navigate to health endpoint
    const response = await page.goto('/health.json');
    
    // Verify response status
    expect(response).toBeTruthy();
    expect(response!.status()).toBe(200);
    
    // Verify content type
    const contentType = response!.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    // Parse JSON response
    const healthData = await response!.json();
    
    // Verify required fields exist and have correct types
    expect(healthData).toHaveProperty('status');
    expect(healthData).toHaveProperty('name');
    expect(healthData).toHaveProperty('version');
    expect(healthData).toHaveProperty('buildTime');
    expect(healthData).toHaveProperty('commit');
    
    // Verify status is "ok"
    expect(healthData.status).toBe('ok');
    
    // Verify name and version are non-empty strings
    expect(typeof healthData.name).toBe('string');
    expect(healthData.name.length).toBeGreaterThan(0);
    expect(healthData.name).not.toBe('');
    
    expect(typeof healthData.version).toBe('string');
    expect(healthData.version.length).toBeGreaterThan(0);
    expect(healthData.version).not.toBe('');
    
    // Verify buildTime is valid ISO-8601 format
    expect(typeof healthData.buildTime).toBe('string');
    expect(healthData.buildTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Verify buildTime is a valid date
    const buildDate = new Date(healthData.buildTime);
    expect(buildDate.toISOString()).toBe(healthData.buildTime);
    expect(isNaN(buildDate.getTime())).toBe(false);
    
    // Verify commit is a non-empty string
    expect(typeof healthData.commit).toBe('string');
    expect(healthData.commit.length).toBeGreaterThan(0);
    
    console.log('✅ Health check validation completed');
    console.log(`   App Name: ${healthData.name}`);
    console.log(`   Version: ${healthData.version}`);
    console.log(`   Build Time: ${healthData.buildTime}`);
    console.log(`   Commit: ${healthData.commit}`);
  });

  test('should have consistent health data across requests', async ({ page }) => {
    // Make multiple requests to ensure consistency
    const responses = await Promise.all([
      page.goto('/health.json'),
      page.goto('/health.json'),
      page.goto('/health.json')
    ]);

    // All responses should be successful
    responses.forEach((response, index) => {
      expect(response!.status()).toBe(200);
    });

    // Parse all responses
    const healthDataArray = await Promise.all(
      responses.map(response => response!.json())
    );

    // All responses should have identical content
    const firstResponse = healthDataArray[0];
    healthDataArray.forEach((healthData, index) => {
      expect(healthData).toEqual(firstResponse);
      console.log(`✅ Request ${index + 1} matches first request`);
    });
  });

  test('should handle health check without authentication', async ({ page }) => {
    // Don't set up any auth mocks - health check should work without auth
    
    const response = await page.goto('/health.json');
    
    expect(response!.status()).toBe(200);
    
    const healthData = await response!.json();
    expect(healthData.status).toBe('ok');
    
    console.log('✅ Health check works without authentication');
  });

  test('should validate health data format strictly', async ({ page }) => {
    const response = await page.goto('/health.json');
    const healthData = await response!.json();
    
    // Strict type checking
    expect(typeof healthData.status).toBe('string');
    expect(typeof healthData.name).toBe('string');
    expect(typeof healthData.version).toBe('string');
    expect(typeof healthData.buildTime).toBe('string');
    expect(typeof healthData.commit).toBe('string');
    
    // No extra properties should be present (strict schema)
    const allowedProperties = ['status', 'name', 'version', 'buildTime', 'commit'];
    const actualProperties = Object.keys(healthData);
    
    actualProperties.forEach(prop => {
      expect(allowedProperties).toContain(prop);
    });
    
    allowedProperties.forEach(prop => {
      expect(actualProperties).toContain(prop);
    });
    
    // Verify exact property count
    expect(actualProperties.length).toBe(allowedProperties.length);
    
    console.log('✅ Health data schema validation passed');
  });

  test('should validate version format', async ({ page }) => {
    const response = await page.goto('/health.json');
    const healthData = await response!.json();
    
    // Version should follow semantic versioning pattern (at least X.Y.Z)
    const versionPattern = /^\d+\.\d+\.\d+/;
    expect(healthData.version).toMatch(versionPattern);
    
    // Version should not contain invalid characters
    const validVersionPattern = /^[\d\w\.\-\+]+$/;
    expect(healthData.version).toMatch(validVersionPattern);
    
    console.log(`✅ Version format validation passed: ${healthData.version}`);
  });

  test('should validate build time is recent', async ({ page }) => {
    const response = await page.goto('/health.json');
    const healthData = await response!.json();
    
    const buildTime = new Date(healthData.buildTime);
    const now = new Date();
    
    // Build time should not be in the future (allowing 1 minute buffer for clock differences)
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    expect(buildTime.getTime()).toBeLessThanOrEqual(oneMinuteFromNow.getTime());
    
    // Build time should not be too old (more than 24 hours ago suggests stale build)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(buildTime.getTime()).toBeGreaterThan(twentyFourHoursAgo.getTime());
    
    console.log(`✅ Build time is reasonable: ${healthData.buildTime}`);
  });

  test('should validate commit hash format', async ({ page }) => {
    const response = await page.goto('/health.json');
    const healthData = await response!.json();
    
    // Commit should be either a valid git SHA or "local-build"
    const isGitSha = /^[a-f0-9]{7,40}$/i.test(healthData.commit);
    const isLocalBuild = healthData.commit === 'local-build';
    const isCI = /^(local|ci|build|deploy)/.test(healthData.commit.toLowerCase());
    
    expect(isGitSha || isLocalBuild || isCI).toBe(true);
    
    // Should not be empty or just whitespace
    expect(healthData.commit.trim().length).toBeGreaterThan(0);
    
    console.log(`✅ Commit hash format is valid: ${healthData.commit}`);
  });
});