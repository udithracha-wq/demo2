import { test } from './fixtures';
import { expectContributorChangesReport } from './support/contributor';

/** Port of features/repeat-contributor-code.feature */
const cases = [{ caseNumber: '00120859' }];

test.describe('Repeat Contributor Code', () => {
  for (const data of cases) {
    test('aligns repeat contributor codes for duplicate names', async ({
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
        'align Repeat Contributor Codes for duplicate names',
        async () => repeatContributor.alignCodesForDuplicateNames()
      );
      const scannedRows = repeatContributor.getLastCollectedRows();

      await test.step('the changes report is produced', async () => {
        await expectContributorChangesReport(repeatContributor, changes);
      });

      await test.step(
        'duplicate contributor names share the same code',
        async () => {
          await repeatContributor.expectDuplicateNamesShareCodes({
            cachedRows: scannedRows,
            skipRescanIfClean: changes.length === 0,
          });
        }
      );
    });
  }
});
