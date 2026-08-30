/**
 * One-time interactive login — complete Idaptive MFA in the browser.
 * When Lightning home loads, session is saved to .auth/nyselections.json
 *
 * Usage: npm run auth:save
 *
 * Tip: Do not close the browser window until you see "Saved session".
 */
import { chromium, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { lightningHomeUrl } from '../pages/SalesforceLoginPage';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const AUTH_PATH = path.resolve('.auth/nyselections.json');
const HOME = lightningHomeUrl();

function isLightningHost(url: string): boolean {
  try {
    return new URL(url).hostname.includes('lightning.force.com');
  } catch {
    return false;
  }
}

async function anyPageOnLightning(pages: Page[]): Promise<Page | null> {
  for (const p of pages) {
    if (p.isClosed()) continue;
    try {
      if (isLightningHost(p.url())) return p;
    } catch {
      // ignore closed/navigating pages
    }
  }
  return null;
}

async function main() {
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true,
  });

  context.on('page', (p) => {
    console.log('New tab/window opened:', p.url());
  });

  const page = await context.newPage();

  console.log('Opening Lightning home — complete login + MFA in the browser...');
  console.log('Do NOT close the Chromium window until "Saved session" appears.');
  console.log(
    'Waiting until any tab hostname is lightning.force.com (up to 5 minutes)...'
  );

  try {
    await page.goto(HOME, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    throw new Error(
      `Browser closed or navigation failed during goto. Re-run npm run auth:save and leave the window open.\n${err}`
    );
  }

  const deadline = Date.now() + 300_000;
  let lightningPage: Page | null = null;

  while (Date.now() < deadline) {
    if (!browser.isConnected()) {
      throw new Error(
        'Browser was closed before login finished. Re-run npm run auth:save and keep the window open until Saved session.'
      );
    }

    lightningPage = await anyPageOnLightning(context.pages());
    if (lightningPage) break;

    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!lightningPage) {
    await browser.close().catch(() => undefined);
    throw new Error(
      'Timed out waiting for Lightning. Finish MFA, then re-run npm run auth:save.'
    );
  }

  await lightningPage.waitForLoadState('domcontentloaded').catch(() => undefined);
  await context.storageState({ path: AUTH_PATH });
  console.log(`Saved session → ${AUTH_PATH}`);
  console.log('Next: npm run bdd:tags "@Auditor1"');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
