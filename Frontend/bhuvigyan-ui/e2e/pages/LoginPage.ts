import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async farmerLogin(mobile: string, otp: string) {
    await this.page.fill('[data-testid="mobile-input"]', mobile);
    await this.page.click('[data-testid="send-otp-btn"]');
    await this.page.fill('[data-testid="otp-input"]', otp);
    await this.page.click('[data-testid="verify-otp-btn"]');
  }

  async adminLogin(email: string, password: string, totp: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.fill('[data-testid="totp-input"]', totp);
    await this.page.click('[data-testid="login-btn"]');
  }
}
