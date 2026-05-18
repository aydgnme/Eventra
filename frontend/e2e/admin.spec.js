import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the auth endpoint to return an admin user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            email: 'admin@university.edu',
            full_name: 'System Admin',
            role: 'admin',
          }
        }),
      });
    });

    // Mock admin summary stats
    await page.route('**/api/admin/reports/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_events: 150,
          total_registrations: 3400,
          avg_rating: '4.5',
          active_organizers: 25,
        }),
      });
    });

    // Mock pending events
    await page.route('**/api/admin/events/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            { id: 101, title: 'Pending Workshop', organizer_id: 2 }
          ]
        }),
      });
    });

    // Mock users list
    await page.route('**/api/admin/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            { id: 1, email: 'admin@university.edu', role: 'admin' },
            { id: 2, email: 'org@university.edu', role: 'organizer' }
          ]
        }),
      });
    });

    // Mock events report
    await page.route('**/api/admin/reports/events*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ events: [] }),
      });
    });

    // Mock organizers report
    await page.route('**/api/admin/reports/organizers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizers: [] }),
      });
    });

    // Mock auth token in localStorage so the app thinks we are logged in
    await page.addInitScript(() => {
      localStorage.setItem('eventra_token', 'mock-admin-token');
    });
  });

  test('should display admin overview dashboard with stats', async ({ page }) => {
    await page.goto('/admin');

    // Verify welcome message
    await expect(page.locator('h1')).toContainText('Welcome back, System Admin');

    // Verify stats are displayed
    await expect(page.locator('text=150').first()).toBeVisible();
    await expect(page.locator('text=3400').first()).toBeVisible();
    await expect(page.locator('text=4.5').first()).toBeVisible();
    await expect(page.locator('text=25').first()).toBeVisible();

    // Verify pending events alert
    await expect(page.locator('text=1 event is waiting for validation')).toBeVisible();
  });

  test('should navigate to event validation page', async ({ page }) => {
    await page.goto('/admin/validation');

    // Verify title
    await expect(page.locator('h1')).toContainText('Event Validation');

    // Verify pending event is listed
    await expect(page.locator('text=Pending Workshop')).toBeVisible();
  });

  test('should navigate to user management page', async ({ page }) => {
    await page.goto('/admin/users');

    // Verify title
    await expect(page.locator('h1')).toContainText('User Management');

    // Verify users are listed
    await expect(page.locator('text=admin@university.edu')).toBeVisible();
    await expect(page.locator('text=org@university.edu')).toBeVisible();
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/admin/reports');

    // Verify title
    await expect(page.locator('h1')).toContainText('Reports & Analytics');
  });
});
