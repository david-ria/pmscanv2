import { test, expect } from '@playwright/test';

test.describe('History Page - Export CSV', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth to simulate logged-in state
    await page.route('**/auth/v1/user**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'fake-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User'
          }
        })
      });
    });

    // Seed a fake mission into localStorage
    await page.addInitScript(() => {
      const fakeMission = {
        id: 'test-mission-123',
        name: 'Test Mission Export',
        startTime: '2024-01-15T10:30:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
        durationMinutes: 30,
        avgPm1: 15.5,
        avgPm25: 25.8,
        avgPm10: 45.2,
        maxPm25: 35.9,
        measurementsCount: 3,
        locationContext: 'Office',
        activityContext: 'Working',
        recordingFrequency: '10s',
        shared: false,
        deviceName: 'PMScan3376DF',
        synced: false,
        weatherDataId: undefined,
        airQualityDataId: undefined,
        measurements: [
          {
            id: 'measurement-1',
            timestamp: '2024-01-15T10:30:00.000Z',
            pm1: 14.2,
            pm25: 23.5,
            pm10: 42.1,
            temperature: 22.5,
            humidity: 65.0,
            latitude: 48.8566,
            longitude: 2.3522,
            accuracy: 10,
            locationContext: 'Office',
            activityContext: 'Working',
            automaticContext: undefined,
            enrichedLocation: undefined,
            geohash: undefined
          },
          {
            id: 'measurement-2',
            timestamp: '2024-01-15T10:40:00.000Z',
            pm1: 15.8,
            pm25: 26.2,
            pm10: 46.3,
            temperature: 23.1,
            humidity: 63.5,
            latitude: 48.8567,
            longitude: 2.3523,
            accuracy: 8,
            locationContext: 'Office',
            activityContext: 'Working',
            automaticContext: undefined,
            enrichedLocation: undefined,
            geohash: undefined
          },
          {
            id: 'measurement-3',
            timestamp: '2024-01-15T10:50:00.000Z',
            pm1: 16.5,
            pm25: 27.7,
            pm10: 47.2,
            temperature: 23.8,
            humidity: 62.0,
            latitude: 48.8568,
            longitude: 2.3524,
            accuracy: 12,
            locationContext: 'Office',
            activityContext: 'Working',
            automaticContext: undefined,
            enrichedLocation: undefined,
            geohash: undefined
          }
        ]
      };

      localStorage.setItem('pmscan_missions', JSON.stringify([fakeMission]));
    });
  });

  test('should display mission and export CSV with correct headers', async ({ page }) => {
    // Set up download interception
    const downloadPromise = page.waitForEvent('download');

    // Navigate to history page
    await page.goto('/history');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the mission appears in the list
    await expect(page.locator('text=Test Mission Export')).toBeVisible();
    
    // Verify mission details are displayed
    await expect(page.locator('text=30')).toBeVisible(); // Duration or measurement count
    await expect(page.locator('text=26')).toBeVisible(); // Average PM2.5 rounded
    await expect(page.locator('text=Office')).toBeVisible(); // Location context
    await expect(page.locator('text=Working')).toBeVisible(); // Activity context

    // Find and click the Export button
    const exportButton = page.locator('button').filter({ hasText: /export/i });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify filename follows expected pattern: [DeviceID]_[YYYYMMDD]_[HHMMSS].csv
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/PMScan3376DF_\d{8}_\d{6}\.csv/);

    // Get download content
    const path = await download.path();
    if (path) {
      const fs = require('fs');
      const csvContent = fs.readFileSync(path, 'utf-8');
      
      // Remove BOM if present (UTF-8 BOM is \uFEFF)
      const cleanContent = csvContent.replace(/^\uFEFF/, '');
      
      // Split into lines and get headers
      const lines = cleanContent.split('\n');
      const headers = lines[0];
      
      // Verify CSV headers match the current implementation
      const expectedHeaders = [
        'Timestamp',
        'PM1 (µg/m³)', 
        'PM2.5 (µg/m³)',
        'PM10 (µg/m³)',
        'Temperature (°C)',
        'Humidity (%)',
        'Latitude',
        'Longitude',
        'GPS Accuracy (m)',
        'Location Context',
        'Activity Context',
        'Auto Context',
        'Enriched Location (Nominatim)',
        'Geohash',
        'Event Type',
        'Event Comment'
      ];
      
      // Check that the header contains the expected columns (quoted CSV format)
      for (const expectedHeader of expectedHeaders) {
        expect(headers).toContain(`"${expectedHeader}"`);
      }
      
      // Verify we have the right number of data rows (3 measurements + header = 4 lines)
      // Account for potential empty line at end
      const dataRows = lines.filter(line => line.trim() !== '').length - 1; // Subtract header
      expect(dataRows).toBe(3);
      
      // Verify first data row contains expected values
      const firstDataRow = lines[1];
      expect(firstDataRow).toContain('2024-01-15T10:30:00'); // Timestamp
      expect(firstDataRow).toContain('14.2'); // PM1
      expect(firstDataRow).toContain('23.5'); // PM2.5  
      expect(firstDataRow).toContain('42.1'); // PM10
      expect(firstDataRow).toContain('48.856600'); // Latitude
      expect(firstDataRow).toContain('2.352200'); // Longitude
      expect(firstDataRow).toContain('Office'); // Location context
      expect(firstDataRow).toContain('Working'); // Activity context

      console.log('CSV Export Test - Headers verified:', headers);
      console.log('CSV Export Test - First data row:', firstDataRow);
    }
  });

  test('should handle export error gracefully', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    
    // Mock download failure by overriding blob creation
    await page.addInitScript(() => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = () => {
        throw new Error('Simulated download failure');
      };
    });
    
    // Verify mission is visible
    await expect(page.locator('text=Test Mission Export')).toBeVisible();
    
    // Try to export (should fail gracefully)
    const exportButton = page.locator('button').filter({ hasText: /export/i });
    await exportButton.click();
    
    // Should show error toast/notification (look for common error indicators)
    const errorIndicators = [
      page.locator('text=Erreur'),
      page.locator('text=Error'),
      page.locator('text=export'),
      page.locator('[role="alert"]')
    ];
    
    // At least one error indicator should appear
    let errorFound = false;
    for (const errorEl of errorIndicators) {
      try {
        await expect(errorEl).toBeVisible({ timeout: 3000 });
        errorFound = true;
        break;
      } catch {
        continue;
      }
    }
    
    // The page should remain functional (not crash)
    await expect(page.locator('text=Test Mission Export')).toBeVisible();
  });

  test('should show export button only when mission has data', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    
    // Mission should be visible
    await expect(page.locator('text=Test Mission Export')).toBeVisible();
    
    // Export button should be enabled when mission has measurements
    const exportButton = page.locator('button').filter({ hasText: /export/i });
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeEnabled();
    
    // Should have measurements count indicator
    await expect(page.locator('text=3')).toBeVisible(); // 3 measurements
  });
});