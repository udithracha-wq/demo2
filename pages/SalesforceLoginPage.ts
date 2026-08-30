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

  private async isOnLightningHome(): Promise<boolean> {
    try {
      const host = new URL(this.page.url()).hostname;
      if (!host.includes('lightning.force.com')) return false;
    } catch {
      return false;
    }

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

  /**
   * Use saved session when possible; only prompt Idaptive when needed.
   */
  async ensureLoggedIn(): Promise<void> {
    await this.openLightningHome();

    if (await this.isOnLightningHome()) {
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
      if (await this.isOnLightningHome()) {
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

    const mfaField = this.page
      .getByRole('textbox', { name: /Enter code|code/i })
      .or(this.page.locator('input[type="text"], input[type="tel"]').last());

    await expect(
      this.page.getByText(/Email sent|Enter code|Authenticate/i).first()
    ).toBeVisible({ timeout: 30_000 });

    if (!mfaCode) {
      throw new Error(
        'Session expired and SF_MFA_CODE is empty.\n' +
          'Run: npm run auth:save  — or set a fresh SF_MFA_CODE in .env'
      );
    }

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
