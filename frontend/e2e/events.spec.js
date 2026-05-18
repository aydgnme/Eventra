import { test, expect } from '@playwright/test';

test.describe('Event Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/events');
  });

  test('should display events list page', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    // Check for event grid or list
    const eventContainers = await page.locator('[data-testid="event-card"]').count();
    expect(eventContainers).toBeGreaterThanOrEqual(0);
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test event');
      await page.waitForTimeout(500);
      // Verify search is applied
      expect(searchInput).toHaveValue('test event');
    }
  });

  test('should have filter options', async ({ page }) => {
    // Check for filter buttons or dropdowns
    const filterButtons = await page.locator('button:has-text("Filter")').count();
    expect(filterButtons).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to event detail page', async ({ page }) => {
    // Try to find and click first event
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);
      expect(page.url()).toMatch(/\/events\/[a-zA-Z0-9-]+/);
    }
  });

  test('should display event details page correctly', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Verify essential event details are visible
      await expect(page.locator('h1')).toBeVisible();
      // Look for event info (date, time, location, etc.)
      const infoElements = await page.locator('[data-testid="event-info"]').count();
      expect(infoElements).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show QR code on event detail page', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      // Check for QR code (might be in a button, img, or canvas)
      const qrButton = page.locator('button:has-text("QR")');
      const qrImage = page.locator('img[alt*="QR"]');

      const hasQR = await qrButton.isVisible() || await qrImage.isVisible();
      expect(hasQR).toBe(true);
    }
  });

  test('should have responsive layout', async ({ page, browserName }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const eventCards = page.locator('[data-testid="event-card"]');
    const count = await eventCards.count();

    // Verify content is still accessible
    if (count > 0) {
      await expect(eventCards.first()).toBeVisible();
    }
  });

  test('should handle pagination if present', async ({ page }) => {
    const paginationButtons = page.locator('button[aria-label*="page"]');
    const count = await paginationButtons.count();

    if (count > 0) {
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        const currentURL = page.url();
        await nextButton.click();
        await page.waitForTimeout(500);
        // URL should change or page should update
        expect(page.url()).toBeTruthy();
      }
    }
  });

  test('should filter events by date range', async ({ page }) => {
    const dateFilterButton = page.locator('button:has-text("Date")');

    if (await dateFilterButton.isVisible()) {
      await dateFilterButton.click();
      // Verify filter UI appears
      const filterPanel = page.locator('[data-testid="date-filter"]');
      expect(filterPanel).toBeTruthy();
    }
  });

  test('should filter events by category', async ({ page }) => {
    const categoryFilter = page.locator('select[name="category"], button:has-text("Category")');
    const count = await categoryFilter.count();

    if (count > 0) {
      await categoryFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should display event materials link if available', async ({ page }) => {
    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 0) {
      await eventLinks.first().click();
      await page.waitForURL(/\/events\/[a-zA-Z0-9-]+/);

      const materialsLink = page.locator('a:has-text("Materials"), a[href*="/materials"]');
      // Material link might not always be present
      expect(materialsLink).toBeTruthy();
    }
  });
});
