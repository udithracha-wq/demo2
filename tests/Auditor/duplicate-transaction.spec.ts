import { test } from './fixtures';
import { requireAtLeastOne, verifyTransactionReport } from './support/reports';

/** Port of features/duplicate-transaction.feature */
const cases = [{ caseNumber: '00120877' }];

test.describe('Duplicate Transaction', () => {
  for (const data of cases) {
    test('removes duplicate flags from all flagged transactions', async ({
      nySession,
      caseSearch,
      duplicateTransaction,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await duplicateTransaction.openDuplicateTransactionReport();
      });

      const processed = await test.step(
        'clear duplicate flags on all flagged transactions',
        async () => duplicateTransaction.clearAllFlaggedTransactions()
      );
      const reportPath = duplicateTransaction.reportAffectedTransactions(
        data.caseNumber,
        processed
      );

      await test.step('click Next and close the dialog', async () => {
        await duplicateTransaction.clickNext();
        await duplicateTransaction.closeDuplicateTransactionDialog();
      });

      await test.step(`case ${data.caseNumber} is still shown`, async () => {
        await duplicateTransaction.expectCaseVisible(data.caseNumber);
      });

      await test.step('report affected transaction numbers', () => {
        requireAtLeastOne(
          processed,
          'no affected transaction numbers were recorded by the clear step.'
        );
        verifyTransactionReport({
          label: 'Affected transaction numbers',
          reportPath,
          recorded: processed,
          countKeys: ['clearedCount'],
        });
      });

      await test.step('no flagged transactions remain', async () => {
        await duplicateTransaction.expectNoFlaggedTransactionsRemain();
      });
    });
  }
});
