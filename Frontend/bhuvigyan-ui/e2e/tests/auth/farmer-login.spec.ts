import { test, expect } from '@playwright/test';

test.describe('Farmer Authentication', () => {
  test('farmer can login with OTP', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="mobile-input"]', '9900000001');
    await page.click('[data-testid="send-otp-btn"]');
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page).toHaveURL('/farmer/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('invalid OTP shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="mobile-input"]', '9900000001');
    await page.click('[data-testid="send-otp-btn"]');
    await page.fill('[data-testid="otp-input"]', '000000');
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
