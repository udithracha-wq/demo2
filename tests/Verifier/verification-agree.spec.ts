import { test } from '../fixtures';
import { verifyTransactionReport } from '../support/reports';

/** Port of features/verification-agree.feature */
const cases = [{ caseNumber: '00120861' }];
const MARKED = 'Agree' as const;

test.describe('Verification Agree', () => {
  for (const data of cases) {
    test(`fills empty Verifier Status with ${MARKED} on all pages`, async ({
      nySession,
      caseSearch,
      verification,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
      });

      await test.step('open Random Sampling Records', async () => {
        await verification.openRandomSamplingRecords();
      });

      const marked = await test.step(
        `set empty Verifier Status to ${MARKED} on all pages`,
        async () => verification.setEmptyVerifierStatusOnAllPages(MARKED)
      );
      const reportPath = verification.reportMarkedTransactions(
        data.caseNumber,
        marked,
        MARKED
      );

      await test.step('save Random Sampling Records', async () => {
        await verification.save({ requireEdits: marked.length > 0 });
        await verification.expectSavedSuccessfully({
          requireToast: marked.length > 0,
        });
      });

      await test.step(
        `report Verifier Status transactions marked ${MARKED}`,
        async () => {
          if (marked.length === 0) {
            console.log(
              `No transaction numbers were marked ${MARKED} (no empty Verifier Status cells).`
            );
            return;
          }
          verifyTransactionReport({
            label: `Verifier Status transaction numbers marked ${MARKED}`,
            reportPath,
            recorded: marked,
            countKeys: ['markedCount'],
            expectField: { key: 'markedValue', value: MARKED },
          });
        }
      );
    });
  }
});
