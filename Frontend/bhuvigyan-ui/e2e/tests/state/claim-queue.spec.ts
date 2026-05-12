import { test, expect } from '@playwright/test';

test.describe('State Officer Claim Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'inspector.ka@bhuvigyan.gov.in');
    await page.click('[data-testid="send-otp-btn"]');
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp-btn"]');
  });

  test('officer sees claim queue', async ({ page }) => {
    await page.goto('/state/claim-queue');
    await expect(page.locator('h1')).toContainText('Claim Queue');
    await expect(page.locator('[data-testid="claim-row"]')).toHaveCount.greaterThan(0);
  });

  test('officer can filter by status', async ({ page }) => {
    await page.goto('/state/claim-queue');
    await page.selectOption('[data-testid="status-filter"]', 'SUBMITTED');
    const rows = page.locator('[data-testid="claim-row"]');
    const count = await rows.count();
    if (count > 0) {
      await expect(rows.first().locator('[data-testid="claim-status"]')).toContainText('SUBMITTED');
    }
  });
});
