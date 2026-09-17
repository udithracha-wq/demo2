import { test } from './fixtures';
import { expectContributorChangesReport } from './support/contributor';

/** Port of features/clear-shared-contributor-code.feature */
const cases = [{ caseNumber: '00120859' }];

test.describe('Clear Shared Repeat Contributor Code', () => {
  for (const data of cases) {
    test('clears codes shared across different contributor names', async ({
      nySession,
      caseSearch,
      repeatContributor,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await repeatContributor.openRepeatContributorReport();
      });

      const changes = await test.step(
        'clear Repeat Contributor Codes shared across different names',
        async () => repeatContributor.clearCodesSharedAcrossDifferentNames()
      );
      const scannedRows = repeatContributor.getLastCollectedRows();

      await test.step('the changes report is produced', async () => {
        await expectContributorChangesReport(repeatContributor, changes);
      });

      await test.step(
        'no code is shared across different names',
        async () => {
          await repeatContributor.expectCodesNotSharedAcrossDifferentNames({
            cachedRows: scannedRows,
            skipRescanIfClean: changes.length === 0,
          });
        }
      );
    });
  }
});
