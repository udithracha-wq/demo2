import { expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_STATE_PATH = path.resolve('.auth/nyselections.json');

/** Org root from .env — e.g. https://myorg--qa.sandbox.lightning.force.com */
function orgBaseUrl(): string {
  const raw = (process.env.BASE_URL || '').replace(/\/$/, '');
  if (!raw || raw.includes('example.com')) {
    throw new Error(
      'Set BASE_URL in .env to your Salesforce Lightning org root\n' +
        '(e.g. https://nyselections--mtxqa.sandbox.lightning.force.com)'
    );
  }
  return raw;
}

export function lightningHomeUrl(): string {
  return `${orgBaseUrl()}/lightning/page/home`;
}

export function caseListUrl(): string {
  return `${orgBaseUrl()}/lightning/o/Case/list`;
}

export function caseRecordUrl(caseId: string): string {
  return `${orgBaseUrl()}/lightning/r/Case/${caseId}/view`;
}

/**
 * CyberArk Idaptive login gate for NYselections Salesforce.
 *
 * Preferred: reuse .auth/nyselections.json (npm run auth:save).
 * Fallback: SF_USERNAME / SF_PASSWORD / SF_MFA_CODE from .env
 */
export class SalesforceLoginPage {
  constructor(private readonly page: Page) {}

  static authStatePath(): string {
    return AUTH_STATE_PATH;
  }

  async openLightningHome(): Promise<void> {
    await this.page.goto(lightningHomeUrl(), {
      waitUntil: 'domcontentloaded',
    });
  }

  private isLightningHost(url: string = this.page.url()): boolean {
    try {
      return new URL(url).hostname.includes('lightning.force.com');
    } catch {
      return false;
    }
  }

  private async isOnLightningHome(): Promise<boolean> {
    if (!this.isLightningHost()) return false;

    const onMfa = await this.page
      .getByText('Email sent!')
      .isVisible()
      .catch(() => false);
    const onLogin = await this.page
      .getByRole('textbox', { name: 'Your username (user@domain)' })
      .isVisible()
      .catch(() => false);

    return !onMfa && !onLogin;
  }

  /** Wait for SSO redirects to settle into Lightning (or stay on login/MFA). */
  private async waitForSessionSettle(timeoutMs = 45_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isOnLightningHome()) return true;

      const onLogin = await this.page
        .getByRole('textbox', { name: 'Your username (user@domain)' })
        .isVisible()
        .catch(() => false);
      const onMfa = await this.page
        .getByText(/Email sent|Enter code|Authenticate/i)
        .first()
        .isVisible()
        .catch(() => false);

      if (onLogin || onMfa) return false;

      await this.page.waitForTimeout(500);
    }
    return this.isOnLightningHome();
  }

  /**
   * Use saved session when possible; only prompt Idaptive when needed.
   */
  async ensureLoggedIn(): Promise<void> {
    await this.openLightningHome();

    if (await this.waitForSessionSettle()) {
      console.log('Reusing saved Salesforce session (.auth/nyselections.json)');
      return;
    }

    await this.loginWithEnvCredentials(false);
  }

  async loginWithEnvCredentials(navigateFirst = true): Promise<void> {
    const username = process.env.SF_USERNAME;
    const password = process.env.SF_PASSWORD;
    const mfaCode = process.env.SF_MFA_CODE;

    if (!username || !password) {
      throw new Error(
        'No valid session and missing SF_USERNAME/SF_PASSWORD.\n' +
          'Run: npm run auth:save  (log in once in the browser), then re-run the test.'
      );
    }

    if (navigateFirst) {
      await this.openLightningHome();
      if (await this.waitForSessionSettle()) {
        return;
      }
    }

    const usernameField = this.page.getByRole('textbox', {
      name: 'Your username (user@domain)',
    });

    if (await usernameField.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await usernameField.fill(username);
      await usernameField.press('Enter');

      const passwordField = this.page.getByRole('textbox', { name: 'Password' });
      await expect(passwordField).toBeVisible({ timeout: 30_000 });
      await passwordField.fill(password);
      await passwordField.press('Enter');
    }

    // After password: either MFA challenge OR direct redirect to Lightning
    const mfaMarker = this.page
      .getByText(/Email sent|Enter code|Authenticate/i)
      .first();
    const outcome = await Promise.race([
      mfaMarker
        .waitFor({ state: 'visible', timeout: 90_000 })
        .then(() => 'mfa' as const),
      this.page
        .waitForURL(/lightning\.force\.com/, { timeout: 90_000 })
        .then(() => 'lightning' as const),
    ]).catch(() => null);

    if (outcome === 'lightning' || (await this.isOnLightningHome())) {
      console.log('Logged into Lightning without MFA challenge');
      return;
    }

    if (outcome !== 'mfa') {
      throw new Error(
        'Login did not reach MFA or Lightning. Re-run: npm run auth:save'
      );
    }

    if (!mfaCode) {
      throw new Error(
        'Session expired and SF_MFA_CODE is empty.\n' +
          'Run: npm run auth:save  — or set a fresh SF_MFA_CODE in .env'
      );
    }

    const mfaField = this.page
      .getByRole('textbox', { name: /Enter code|code/i })
      .or(this.page.locator('input[type="text"], input[type="tel"]').last());

    await expect(mfaField.first()).toBeVisible({ timeout: 30_000 });
    await mfaField.first().click();
    await mfaField.first().fill(mfaCode);

    const authenticate = this.page.getByRole('button', {
      name: /^Authenticate$/i,
    });
    if (await authenticate.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(authenticate).toBeEnabled({ timeout: 10_000 });
      await authenticate.click();
    } else {
      await mfaField.first().press('Enter');
    }

    await this.page.waitForURL(/lightning\.force\.com/, { timeout: 90_000 });
    await expect(this.page.getByText('Email sent!')).toHaveCount(0, {
      timeout: 30_000,
    });
  }

  async persistSession(): Promise<void> {
    if (!(await this.isOnLightningHome())) {
      return;
    }
    const context = this.page.context();
    fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
    await context.storageState({ path: AUTH_STATE_PATH });
  }
}
