/**
 * Test-data reset: clear the Primary Auditor lookup on a Case so the
 * @SupervisorStep1 scenario can assign it again.
 *
 * Usage: CASE_ID=500cp00000YrQHOAA3 npx tsx scripts/reset-primary-auditor.ts
 */
import { chromium, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceLoginPage } from '../pages/SalesforceLoginPage';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CASE_ID = process.env.CASE_ID || '500cp00000YrQHOAA3';

async function main() {
  const authPath = SalesforceLoginPage.authStatePath();
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
    viewport: { width: 1920, height: 1080 },
    storageState,
  });
  const page = await context.newPage();

  await page.goto(`${process.env.BASE_URL}/lightning/r/Case/${CASE_ID}/view`, {
    waitUntil: 'domcontentloaded',
  });

  const detailsTab = page.getByRole('tab', { name: 'Details' }).first();
  await expect(detailsTab).toBeVisible({ timeout: 120_000 });
  await detailsTab.click();

  const field = page
    .getByRole('listitem')
    .filter({ hasText: /Primary Auditor/i })
    .first();
  await expect(field).toBeVisible({ timeout: 60_000 });

  const before = (await field.innerText()).replace(/\s+/g, ' ');
  console.log('Before:', before);

  await page.getByRole('button', { name: /^Edit Primary Auditor$/i }).click();

  const clear = page.getByRole('button', {
    name: /Clear Primary Auditor Selection/i,
  });
  if (await clear.isVisible().catch(() => false)) {
    await clear.click();
  } else {
    console.log('Nothing to clear — field already empty.');
  }

  const save = page.getByRole('button', { name: /^Save$/i }).first();
  await expect(save).toBeVisible({ timeout: 30_000 });
  await save.click();
  await page.waitForTimeout(6_000);

  console.log('After:', (await field.innerText()).replace(/\s+/g, ' '));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
