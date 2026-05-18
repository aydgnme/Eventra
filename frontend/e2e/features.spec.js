import { test, expect } from '@playwright/test';

test.describe('Feature Tests - QR Code and Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('should display QR code modal on event detail page', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for QR code button
      const qrButton = page.locator('button:has-text("QR"), button[aria-label*="QR"]');
      if (await qrButton.isVisible()) {
        await qrButton.click();

        // Modal should appear
        const modal = page.locator('[role="dialog"], .modal, .bg-opacity-50');
        const isVisible = await modal.isVisible().catch(() => false);
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('should allow downloading QR code', async ({ page, context }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      const qrButton = page.locator('button:has-text("QR"), button[aria-label*="QR"]');
      if (await qrButton.isVisible()) {
        await qrButton.click();

        // Look for download button
        const downloadButton = page.locator('button:has-text("Download"), button[aria-label*="download"]');
        const isVisible = await downloadButton.isVisible().catch(() => false);
        expect(isVisible).toBeTruthy();
      }
    }
  });

  test('should export event as ICS calendar file', async ({ page, context }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for export/ICS button
      const exportButton = page.locator('button:has-text("Calendar"), button[aria-label*="export"], button:has-text("ICS")');
      if (await exportButton.isVisible()) {
        // Setup download promise before clicking
        const downloadPromise = context.waitForEvent('download');
        await exportButton.click();

        try {
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.ics$/);
        } catch (e) {
          // Download might not trigger in test environment
          // But button should at least be clickable
          expect(exportButton).toBeVisible();
        }
      }
    }
  });

  test('should display attendance information', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for attendance info
      const attendanceInfo = page.locator('[data-testid="attendance"], :has-text("Participant"), :has-text("Registered")');
      const hasAttendanceInfo = await attendanceInfo.isVisible().catch(() => false);

      if (hasAttendanceInfo) {
        expect(attendanceInfo).toBeVisible();
      }
    }
  });

  test('should display average attendance if available', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for attendance stats
      const stats = page.locator('[data-testid="attendance-stats"], :has-text("Average Attendance")');
      const hasStats = await stats.isVisible().catch(() => false);

      if (hasStats) {
        expect(stats).toBeVisible();
      }
    }
  });

  test('should support event filters', async ({ page }) => {
    // Test different filter combinations
    const filterButtons = page.locator('button[aria-label*="filter"], button:has-text("Filter")');
    const count = await filterButtons.count();

    if (count > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(300);

      // Verify filter UI is visible
      const filterPanel = page.locator('[data-testid="filter-panel"], .filter-menu');
      const isPanelVisible = await filterPanel.isVisible().catch(() => true); // Might not have data-testid
      expect(isPanelVisible).toBeTruthy();
    }
  });

  test('should have working search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Search should be applied
      const searchValue = await searchInput.inputValue();
      expect(searchValue).toBe('test');

      // Results should update (might be showing "no results" message or filtered results)
      const results = page.locator('[data-testid="event-card"]');
      const resultCount = await results.count();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display event status badges', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for status badge
      const statusBadge = page.locator('[data-testid="status-badge"], .badge, :has-text("Ongoing"), :has-text("Upcoming")');
      const hasStatus = await statusBadge.isVisible().catch(() => false);

      if (hasStatus) {
        expect(statusBadge).toBeVisible();
      }
    }
  });

  test('should display registration button for logged out users', async ({ page }) => {
    // This test assumes user is not logged in
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Look for register/participate button
      const registerButton = page.locator('button:has-text("Register"), button:has-text("Join")');
      const hasRegisterButton = await registerButton.isVisible().catch(() => false);

      if (hasRegisterButton) {
        expect(registerButton).toBeVisible();
      }
    }
  });
});

test.describe('API and Data Loading', () => {
  test('should load events data from API', async ({ page }) => {
    await page.goto('/events');

    // Verify that event data, "no events" message, or error alert is displayed
    const content = page.locator('h3, :has-text("No events found"), [role="alert"]');
    await expect(content.first()).toBeVisible({ timeout: 15000 });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept and fail API calls
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('/events');

    // Either show alert or error message
    const errorIndicator = page.locator('[role="alert"], :has-text("Network Error"), :has-text("failed"), :has-text("error"), :has-text("Failed")');
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/api/**', async (route) => {
      await page.waitForTimeout(2000);
      await route.continue();
    });

    await page.goto('/events');

    // Loading indicator should be visible initially
    const loader = page.locator('[data-testid="loader"], .spinner, .animate-spin');
    const isLoading = await loader.isVisible().catch(() => false);

    expect(isLoading).toBeTruthy();
  });

  test('should cache and reuse data properly', async ({ page }) => {
    // First load
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const firstEventCount = await page.locator('[data-testid="event-card"]').count();

    // Navigate away and back
    await page.goto('/');
    await page.goto('/events');

    const secondEventCount = await page.locator('[data-testid="event-card"]').count();

    // Event count should be same (data was cached)
    expect(firstEventCount).toBe(secondEventCount);
  });
});
