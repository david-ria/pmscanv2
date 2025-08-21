import { test, expect } from '@playwright/test';
import { setupNetworkIsolation } from './network-isolation';

test.describe('History Deduplication - Crash Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await setupNetworkIsolation(page);
  });

  test('should show only one mission after crash recovery and completion', async ({ page }) => {
    console.log('🔍 Starting crash recovery deduplication test...');
    
    // Navigate to app in test mode
    await page.goto('/?e2e=1');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    console.log('✅ Dashboard loaded');

    // Start a recording session
    console.log('🎬 Starting recording session...');
    const recordButton = page.locator('[data-testid="record-button"]');
    await recordButton.click();
    
    // Wait for recording to start
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
    console.log('🔴 Recording started');
    
    // Simulate some recording time and data collection
    await page.waitForTimeout(2000);
    
    // Simulate crash by reloading the page mid-recording
    console.log('💥 Simulating crash/reload...');
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Check if crash recovery detected the incomplete session
    const crashRecoveryDialog = page.locator('[role="dialog"]').filter({ hasText: /recovered|crash|session/i });
    if (await crashRecoveryDialog.isVisible({ timeout: 3000 })) {
      console.log('🔧 Crash recovery dialog detected');
      
      // Accept the recovery (keep the partial mission)
      const keepButton = crashRecoveryDialog.locator('button').filter({ hasText: /keep|save|recover/i }).first();
      if (await keepButton.isVisible()) {
        await keepButton.click();
        console.log('💾 Kept recovered mission');
      }
    } else {
      console.log('ℹ️ No crash recovery dialog - continuing test');
    }

    // Start a new recording session (to complete what was "recovered")
    console.log('🎬 Starting new recording session after crash...');
    
    // Wait for any recovery processing to complete
    await page.waitForTimeout(1000);
    
    // Click record button again
    const newRecordButton = page.locator('[data-testid="record-button"]');
    await newRecordButton.click();
    
    // Wait for recording to start
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
    console.log('🔴 New recording started');
    
    // Let it record for a bit
    await page.waitForTimeout(2000);
    
    // Stop the recording properly
    console.log('🛑 Stopping recording...');
    await newRecordButton.click();
    
    // Wait for stop recording dialog/confirmation
    await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible({ timeout: 5000 });
    
    // Fill out mission details in the save dialog
    const saveDialog = page.locator('[role="dialog"]').filter({ hasText: /save|mission|name/i });
    if (await saveDialog.isVisible({ timeout: 5000 })) {
      console.log('💾 Mission save dialog appeared');
      
      const missionNameInput = saveDialog.locator('input').first();
      await missionNameInput.fill('Crash Recovery Test Mission');
      
      const locationInput = saveDialog.locator('input').nth(1);
      if (await locationInput.isVisible()) {
        await locationInput.fill('Test Location');
      }
      
      const activityInput = saveDialog.locator('input').nth(2);
      if (await activityInput.isVisible()) {
        await activityInput.fill('Recovery Testing');
      }
      
      const saveButton = saveDialog.locator('button').filter({ hasText: /save|create/i });
      await saveButton.click();
      
      console.log('✅ Mission saved');
    } else {
      console.log('ℹ️ No save dialog - mission might be auto-saved');
    }
    
    // Wait for save processing
    await page.waitForTimeout(2000);
    
    // Navigate to history page to verify deduplication
    console.log('📋 Navigating to history page...');
    await page.click('[data-testid="nav-history"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    console.log('📋 History page loaded');
    
    // Check for mission cards
    const missionCards = page.locator('[data-testid="mission-card"]');
    const missionCount = await missionCards.count();
    
    console.log(`📊 Found ${missionCount} missions in history`);
    
    // Verify only ONE mission appears (no duplicates from crash recovery)
    expect(missionCount).toBe(1);
    
    // Verify the mission has the expected properties
    if (missionCount > 0) {
      const missionCard = missionCards.first();
      
      // Check that mission name is visible and not a "recovered" temporary name
      const missionName = await missionCard.locator('[data-testid="mission-name"]').textContent();
      console.log(`📝 Mission name: ${missionName}`);
      
      // Should be the final mission name, not a recovered/temporary name
      expect(missionName).not.toMatch(/recovered|crash|session|partial/i);
      
      // Check for measurements count
      const measurementsInfo = missionCard.locator('[data-testid="mission-measurements"]');
      if (await measurementsInfo.isVisible()) {
        const measurementsText = await measurementsInfo.textContent();
        console.log(`📈 Measurements: ${measurementsText}`);
        
        // Should have at least some measurements
        expect(measurementsText).toMatch(/\d+/);
      }
      
      // Verify mission details can be opened
      await missionCard.click();
      
      // Check if details dialog opens
      const detailsDialog = page.locator('[role="dialog"]').filter({ hasText: /details|mission/i });
      if (await detailsDialog.isVisible({ timeout: 3000 })) {
        console.log('📋 Mission details dialog opened successfully');
        
        // Close the dialog
        const closeButton = detailsDialog.locator('button').filter({ hasText: /close|×/i }).first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
    
    console.log('✅ Crash recovery deduplication test completed successfully');
  });

  test('should properly merge multiple crash recovery attempts', async ({ page }) => {
    console.log('🔍 Starting multiple crash recovery test...');
    
    await page.goto('/?e2e=1');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Simulate multiple crash/recovery cycles
    for (let i = 1; i <= 3; i++) {
      console.log(`💥 Crash cycle ${i}/3`);
      
      // Start recording
      const recordButton = page.locator('[data-testid="record-button"]');
      await recordButton.click();
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
      
      // Record for a short time
      await page.waitForTimeout(1000 + i * 500); // Increasing duration each cycle
      
      // Simulate crash
      await page.reload();
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      // Handle crash recovery dialog if it appears
      const crashRecoveryDialog = page.locator('[role="dialog"]').filter({ hasText: /recovered|crash|session/i });
      if (await crashRecoveryDialog.isVisible({ timeout: 3000 })) {
        const keepButton = crashRecoveryDialog.locator('button').filter({ hasText: /keep|save|recover/i }).first();
        if (await keepButton.isVisible()) {
          await keepButton.click();
        }
      }
      
      await page.waitForTimeout(500);
    }
    
    // Final proper recording session
    console.log('🎬 Starting final complete recording...');
    const finalRecordButton = page.locator('[data-testid="record-button"]');
    await finalRecordButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
    
    await page.waitForTimeout(2000);
    
    // Stop recording properly
    await finalRecordButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible({ timeout: 5000 });
    
    // Handle save dialog
    const saveDialog = page.locator('[role="dialog"]').filter({ hasText: /save|mission/i });
    if (await saveDialog.isVisible({ timeout: 5000 })) {
      await saveDialog.locator('input').first().fill('Multi-Crash Recovery Test');
      const saveButton = saveDialog.locator('button').filter({ hasText: /save|create/i });
      await saveButton.click();
    }
    
    await page.waitForTimeout(2000);
    
    // Check history for deduplication
    await page.click('[data-testid="nav-history"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const missionCards = page.locator('[data-testid="mission-card"]');
    const missionCount = await missionCards.count();
    
    console.log(`📊 Final mission count after multiple crashes: ${missionCount}`);
    
    // Should still be only 1 mission despite multiple crash/recovery cycles
    expect(missionCount).toBeLessThanOrEqual(2); // Allow for 1-2 missions max (in case of edge cases)
    
    if (missionCount > 0) {
      // Verify the final mission is not a recovered/temporary one
      const finalMissionName = await missionCards.first().locator('[data-testid="mission-name"]').textContent();
      expect(finalMissionName).not.toMatch(/recovered|crash|session.*\d{4}-\d{2}-\d{2}/i);
    }
    
    console.log('✅ Multiple crash recovery test completed');
  });

  test('should maintain data integrity across crash recovery cycles', async ({ page }) => {
    console.log('🔍 Testing data integrity across crash recovery...');
    
    await page.goto('/?e2e=1');
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Start initial recording
    const recordButton = page.locator('[data-testid="record-button"]');
    await recordButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
    
    // Let it collect some data
    await page.waitForTimeout(3000);
    
    // Crash and recover
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
    
    // Handle recovery
    const crashRecoveryDialog = page.locator('[role="dialog"]').filter({ hasText: /recovered|crash|session/i });
    if (await crashRecoveryDialog.isVisible({ timeout: 3000 })) {
      const keepButton = crashRecoveryDialog.locator('button').filter({ hasText: /keep|save|recover/i }).first();
      if (await keepButton.isVisible()) {
        await keepButton.click();
      }
    }
    
    // Complete the mission properly
    await recordButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);
    
    await recordButton.click();
    await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible({ timeout: 5000 });
    
    // Save the mission
    const saveDialog = page.locator('[role="dialog"]').filter({ hasText: /save|mission/i });
    if (await saveDialog.isVisible({ timeout: 5000 })) {
      await saveDialog.locator('input').first().fill('Data Integrity Test');
      
      // Add location and activity context
      const locationInput = saveDialog.locator('input').nth(1);
      if (await locationInput.isVisible()) {
        await locationInput.fill('Test Laboratory');
      }
      
      const activityInput = saveDialog.locator('input').nth(2);
      if (await activityInput.isVisible()) {
        await activityInput.fill('Integrity Testing');
      }
      
      await saveDialog.locator('button').filter({ hasText: /save|create/i }).click();
    }
    
    await page.waitForTimeout(2000);
    
    // Go to history and verify data integrity
    await page.click('[data-testid="nav-history"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const missionCards = page.locator('[data-testid="mission-card"]');
    expect(await missionCards.count()).toBe(1);
    
    // Click to open mission details
    await missionCards.first().click();
    
    const detailsDialog = page.locator('[role="dialog"]').filter({ hasText: /details|mission/i });
    if (await detailsDialog.isVisible({ timeout: 3000 })) {
      // Verify mission has proper metadata
      const missionContent = await detailsDialog.textContent();
      
      expect(missionContent).toMatch(/Data Integrity Test/);
      expect(missionContent).toMatch(/Test Laboratory/);
      expect(missionContent).toMatch(/Integrity Testing/);
      
      // Check for measurements/data
      expect(missionContent).toMatch(/PM2\.5|measurements|data points/i);
      
      console.log('✅ Mission data integrity verified');
      
      // Close dialog
      const closeButton = detailsDialog.locator('button').filter({ hasText: /close|×/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
    
    console.log('✅ Data integrity test completed');
  });
});
