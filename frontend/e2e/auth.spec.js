import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('a:has-text("Sign in")');
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });

  test('should show login form elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
    await expect(page.locator('a:has-text("Forgot password?")')).toBeVisible();
  });

  test('should show registration form elements', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('input[name="full_name"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create account")')).toBeVisible();
  });

  test('should validate email format on login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("Sign in")');

    // Check for validation error or button disabled state
    const emailInput = page.locator('input[type="email"]');
    const validationState = await emailInput.evaluate((el) => el.validity.valid);
    expect(validationState).toBe(false);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    await page.click('a:has-text("Forgot password?")');
    await page.waitForURL('/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });

  test('should show forgot password form', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible();
  });

  test('should navigate back to login from registration', async ({ page }) => {
    await page.goto('/register');

    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });
});
