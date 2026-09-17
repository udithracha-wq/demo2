import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Verifier-update error when Accept is chosen from Approval History
 * while Random Sampling Records still has Disagree Verifier Status values.
 * Locators from codegen-output/agree-all-error.ts
 */
export class AgreeAllErrorPage extends BasePage {
  private static readonly VERIFIER_UPDATE_ERROR =
    /Please update the Verifier/i;

  async expectVerifierUpdateError(): Promise<void> {
    const error = this.page.getByText(
      AgreeAllErrorPage.VERIFIER_UPDATE_ERROR
    );
    await expect(error.first()).toBeVisible({ timeout: 30_000 });
  }
}
