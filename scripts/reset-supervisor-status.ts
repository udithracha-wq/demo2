/**
 * Test-data reset: clear Supervisor Status on every row of a case's
 * Supervisor Review Data report, so the @SupervisorAgreeWithAuditor scenario
 * has something to change again.
 *
 * Saving Agree with Auditor is a one-way edit — once every Disagree row is
 * answered, the report offers no Save button and the Record Updated
 * notification can never appear.
 *
 * Usage: CASE_NUMBER=00121029 npm run reset:supervisor-status
 */
import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DuplicateTransactionPage } from '../pages/DuplicateTransactionPage';
import { SalesforceLoginPage } from '../pages/SalesforceLoginPage';
import { SupervisorAgreeWithAuditorPage } from '../pages/SupervisorAgreeWithAuditorPage';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CASE_NUMBER = process.env.CASE_NUMBER || '00121029';

async function main() {
  const authPath = SalesforceLoginPage.authStatePath();
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: Number(process.env.SLOW_MO || 0),
  });
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL,
    viewport: { width: 1920, height: 1080 },
    storageState,
  });
  const page = await context.newPage();

  const caseSearch = new DuplicateTransactionPage(page);
  await caseSearch.searchAndOpenCase(CASE_NUMBER);

  const supervisor = new SupervisorAgreeWithAuditorPage(page);
  await supervisor.openSupervisorReviewData();

  const cleared = await supervisor.clearSupervisorStatusForAllRows();

  if (cleared.length === 0) {
    console.log(`Nothing to reset on case ${CASE_NUMBER}.`);
    await browser.close();
    return;
  }

  const notification = await supervisor.save({ requireEdits: true });
  supervisor.expectRecordUpdatedToast(notification);

  // Re-read from a fresh page load: a success toast alone has proved not to
  // guarantee the write landed, and a reset that silently did nothing makes
  // the next test run fail for the wrong reason.
  await caseSearch.searchAndOpenCase(CASE_NUMBER);
  await supervisor.openSupervisorReviewData();
  const stillSet = await supervisor.findRowsWithSupervisorStatus();

  if (stillSet.length > 0) {
    await browser.close();
    throw new Error(
      `Reset did not persist: ${stillSet.length} row(s) still hold a ` +
        `Supervisor Status (${stillSet.join(', ')}). Re-run the reset.`
    );
  }

  console.log(
    `Reset Supervisor Status on ${cleared.length} row(s) of case ${CASE_NUMBER} (verified).`
  );

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
