import { test, expect } from '@playwright/test';

test.describe('XSS Protection', () => {
  test('claim description XSS is escaped', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="mobile-input"]', '9900000001');
    await page.click('[data-testid="send-otp-btn"]');
    await page.fill('[data-testid="otp-input"]', '123456');
    await page.click('[data-testid="verify-otp-btn"]');
    await page.goto('/farmer/create-claim');
    await page.selectOption('[data-testid="policy-select"]', 'policy-1');
    await page.click('text=DROUGHT');
    await page.fill('[data-testid="loss-date"]', '2024-08-15');
    await page.fill('[data-testid="affected-area"]', '2.5');
    await page.fill('[data-testid="claim-amount"]', '45000');
    await page.fill('[data-testid="description"]', "<script>alert('xss')</script>");
    await page.click('[data-testid="next-step"]');
    await page.click('[data-testid="submit-claim"]');

    // Verify no alert triggered
    page.on('dialog', async (dialog) => {
      test.fail(true, 'XSS alert was triggered');
      await dialog.dismiss();
    });
  });
});
