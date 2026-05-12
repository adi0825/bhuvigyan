import { test, expect } from '@playwright/test';

test.describe('Farmer Create Claim', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="mobile-input"]', '9900000001');
    await page.click('[data-testid="send-otp-btn"]');
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp-btn"]');
    await expect(page).toHaveURL('/farmer/dashboard');
  });

  test('farmer can submit a claim', async ({ page }) => {
    await page.goto('/farmer/create-claim');
    await page.selectOption('[data-testid="policy-select"]', 'policy-1');
    await page.click('text=DROUGHT');
    await page.fill('[data-testid="loss-date"]', '2024-08-15');
    await page.fill('[data-testid="affected-area"]', '2.5');
    await page.fill('[data-testid="claim-amount"]', '45000');
    await page.fill('[data-testid="description"]', 'Severe drought damage across plot');
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="submit-claim"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('claim validation shows errors for empty fields', async ({ page }) => {
    await page.goto('/farmer/create-claim');
    await page.click('[data-testid="submit-claim"]');
    await expect(page.locator('[data-testid="error-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-loss-type"]')).toBeVisible();
  });
});
