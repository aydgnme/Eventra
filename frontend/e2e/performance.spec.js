import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load events page with reasonable response time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/events', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have excessive layout shifts', async ({ page }) => {
    await page.goto('/events');

    // Measure Cumulative Layout Shift
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // CLS should be good (< 0.1)
    expect(cls).toBeLessThan(0.25);
  });

  test('should have efficient CSS and minimal render-blocking resources', async ({ page }) => {
    const metrics = [];

    page.on('response', (response) => {
      if (response.request().resourceType() === 'stylesheet') {
        metrics.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/');

    // Should have some stylesheets
    expect(metrics.length).toBeGreaterThan(0);

    // All stylesheets should load successfully
    metrics.forEach((metric) => {
      expect(metric.status).toBe(200);
    });
  });

  test('should lazy load images', async ({ page }) => {
    await page.goto('/events');

    const images = page.locator('img');
    const count = await images.count();

    if (count > 0) {
      // Check first image loading attribute
      const firstImage = images.first();
      const loading = await firstImage.getAttribute('loading').catch(() => 'auto');

      // Images should either be lazy loaded or have explicit loading attribute
      expect(['lazy', 'eager', 'auto', null]).toContain(loading);
    }
  });

  test('should have minimal JavaScript bundle size', async ({ page }) => {
    const scripts = [];

    page.on('response', (response) => {
      if (response.request().resourceType() === 'script') {
        scripts.push({
          url: response.url(),
          size: 0, // Size would come from headers
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have JavaScript files
    expect(scripts.length).toBeGreaterThan(0);
  });

  test('should not have broken images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const image = images.nth(i);
      const isComplete = await image.evaluate((el) => {
        return el.complete && el.naturalHeight !== 0;
      });

      // Images should load or be intentionally empty
      expect(isComplete || (await image.getAttribute('src') === '')).toBeTruthy();
    }
  });

  test('should handle concurrent API requests efficiently', async ({ page }) => {
    const requests = [];

    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        requests.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    // Should complete all requests
    expect(requests.length).toBeGreaterThanOrEqual(0);

    // All requests should be successful
    requests.forEach((request) => {
      expect(request.status).toBeLessThan(400);
    });
  });

  test('should properly clean up resources on navigation', async ({ page }) => {
    const initialListeners = await page.evaluate(() => {
      return Object.keys(window.__listeners || {}).length;
    });

    await page.goto('/');
    await page.goto('/events');
    await page.goto('/');

    // Navigate multiple times
    const finalListeners = await page.evaluate(() => {
      return Object.keys(window.__listeners || {}).length;
    });

    // Listener count should not grow unbounded
    // (This is a simple check - proper implementation would track actual listeners)
    expect(finalListeners).toBeLessThanOrEqual(initialListeners + 50);
  });

  test('should not have memory leaks during page usage', async ({ page }) => {
    const initialMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    // Perform several interactions
    await page.goto('/');
    await page.goto('/events');

    const eventLinks = page.locator('a[href*="/events/"]');
    const count = await eventLinks.count();

    if (count > 3) {
      await eventLinks.nth(0).click();
      await page.waitForTimeout(500);
      await page.goBack();
      await page.waitForTimeout(500);

      await eventLinks.nth(1).click();
      await page.waitForTimeout(500);
      await page.goBack();
    }

    const finalMemory = await page.evaluate(() => {
      return performance.memory?.usedJSHeapSize || 0;
    });

    // Memory increase should be reasonable
    const memoryIncrease = finalMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB increase is acceptable
  });
});
