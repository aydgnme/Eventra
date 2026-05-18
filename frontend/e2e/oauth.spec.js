import { test, expect } from '@playwright/test';

test.describe('OAuth Authentication Flow', () => {
  test('should trigger Google OAuth redirect', async ({ page }) => {
    await page.goto('/login');

    // Intercept the navigation to prevent actually leaving the site
    let redirectedUrl = '';
    await page.route('**/auth/oauth/google', (route) => {
      redirectedUrl = route.request().url();
      route.abort('aborted');
    });

    // Click the Google login button
    await page.click('button:has-text("Continue with Google")');

    // Wait briefly for the route to be intercepted
    await page.waitForTimeout(500);

    // Verify the correct backend OAuth URL was hit
    expect(redirectedUrl).toContain('/auth/oauth/google');
  });

  test('should handle successful OAuth callback', async ({ page }) => {
    // Mock the /api/auth/me endpoint that the callback page will hit
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 99,
            email: 'google.user@university.edu',
            full_name: 'Google User',
            role: 'student',
          }
        }),
      });
    });

    // Navigate directly to the callback page as if Google redirected us
    await page.goto('/oauth/callback?token=mock-oauth-token');

    // The callback page should process the token and redirect to dashboard
    await page.waitForURL('**/dashboard*');
    expect(page.url()).toContain('/dashboard');

    // Verify the token was saved in localStorage
    const token = await page.evaluate(() => localStorage.getItem('eventra_token'));
    expect(token).toBe('mock-oauth-token');
  });

  test('should handle OAuth error callback gracefully', async ({ page }) => {
    // If Google login fails or is cancelled, we return to login with an error
    await page.goto('/login?oauth_error=Access%20denied');

    // Verify the error modal is displayed
    await expect(page.locator('text=Sign-in failed')).toBeVisible();
    await expect(page.locator('text=Access denied')).toBeVisible();
  });

  test('should handle missing token on callback page', async ({ page }) => {
    // If the callback page is hit without a token, it should redirect to login
    await page.goto('/oauth/callback');

    // Verify it redirects to login with an error param
    await page.waitForURL('**/login*');
    expect(page.url()).toContain('error=oauth_failed');
  });
});
