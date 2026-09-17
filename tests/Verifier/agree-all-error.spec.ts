import { test } from './fixtures';
import { requireAtLeastOne, verifyTransactionReport } from './support/reports';

/** Port of features/agree-all-error.feature */
const cases = [
  { caseNumber: '00120861', approvalAction: 'Accept' as const, comments: 'test' },
];

test.describe('Agree All Error', () => {
  for (const data of cases) {
    test(`${data.approvalAction} is blocked when Verifier Status is Disagree`, async ({
      nySession,
      caseSearch,
      verification,
      emptyErrorMessage,
      agreeAllError,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await verification.openRandomSamplingRecords();
      });

      const disagree = await test.step(
        'Disagree Verifier Status fields are present',
        async () => {
          const found =
            await verification.findVerifierStatusTransactionNumbers('Disagree');
          requireAtLeastOne(
            found,
            'expected at least one Disagree Verifier Status field on Random ' +
              'Sampling Records so Accept from Approval History shows the ' +
              'Verifier update error.'
          );
          return found;
        }
      );
      const reportPath = verification.reportDisagreeVerifierTransactions(
        data.caseNumber,
        disagree
      );

      await test.step(
        `choose ${data.approvalAction} from Approval History`,
        async () => {
          await emptyErrorMessage.closeRandomSamplingRecords();
          await emptyErrorMessage.chooseApprovalActionWithComments(
            data.approvalAction,
            data.comments
          );
        }
      );

      await test.step('the Verifier update error is shown', async () => {
        await agreeAllError.expectVerifierUpdateError();
        await emptyErrorMessage.cancelAndCloseApprovalDialog();
      });

      await test.step('report Disagree Verifier Status transactions', () => {
        verifyTransactionReport({
          label: 'Disagree Verifier Status transaction numbers',
          reportPath,
          recorded: disagree,
          countKeys: ['disagreeCount'],
        });
      });
    });
  }
});
