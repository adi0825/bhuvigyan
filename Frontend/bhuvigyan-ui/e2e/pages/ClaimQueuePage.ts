import { Page } from '@playwright/test';

export class ClaimQueuePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/state/claim-queue');
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
  }

  async clickReviewClaim(claimNumber: string) {
    await this.page.click(`[data-testid="review-btn-${claimNumber}"]`);
  }

  async getClaimCount() {
    return this.page.locator('[data-testid="claim-row"]').count();
  }
}
