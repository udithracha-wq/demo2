import { test } from './fixtures';
import { verifyTransactionReport } from './support/reports';

/** Port of features/isdistrict.feature */
const cases = [{ caseNumber: '00120857' }];
const MARKED = 'No' as const;

test.describe('Is District', () => {
  for (const data of cases) {
    test(`sets empty In District Confirmed to ${MARKED} on all pages`, async ({
      nySession,
      caseSearch,
      isDistrict,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await isDistrict.openAuditMatchingClaimData();
      });

      const marked = await test.step(
        `set empty In District Confirmed to ${MARKED} on all pages`,
        async () => isDistrict.setEmptyInDistrictConfirmedOnAllPages(MARKED)
      );
      const reportPath = isDistrict.reportMarkedTransactions(
        data.caseNumber,
        marked,
        MARKED
      );

      await test.step('save Audit Matching Claim Data', async () => {
        await isDistrict.saveAuditMatchingClaimData({
          requireEdits: marked.length > 0,
        });
        await isDistrict.expectSavedSuccessfully({
          requireToast: marked.length > 0,
        });
      });

      await test.step(
        `report In District Confirmed transactions marked ${MARKED}`,
        () => {
          if (marked.length === 0) {
            console.log(
              `No transaction numbers were marked ${MARKED} (no empty In District Confirmed? cells).`
            );
            return;
          }
          verifyTransactionReport({
            label: `In District Confirmed? transaction numbers marked ${MARKED}`,
            reportPath,
            recorded: marked,
            countKeys: ['markedCount', 'markedNoCount', 'markedYesCount'],
            expectField: { key: 'markedValue', value: MARKED },
          });
        }
      );
    });
  }
});
