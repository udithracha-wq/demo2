import { test } from '../fixtures';
import { requireAtLeastOne } from '../support/reports';

/** Port of features/supervisor-disagree-with-auditor.feature */
const cases = [
  {
    caseNumber: '00121029',
    caseStatus: 'Supervisor Review',
    comments: 'test',
  },
];
const MARKED = 'Disagree with Auditor' as const;
const APPROVAL_ACTION = 'Reject' as const;

test.describe('Supervisor Disagree With Auditor', () => {
  for (const data of cases) {
    test(`answers auditor Disagree rows with ${MARKED} then rejects the case`, async ({
      nySession,
      auditor1,
      caseSearch,
      supervisorAgree,
      emptyErrorMessage,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
      });

      await test.step(`case is in ${data.caseStatus}`, async () => {
        await auditor1.expectCaseStatus(data.caseStatus);
      });

      await test.step('open Supervisor Review Data', async () => {
        await supervisorAgree.openSupervisorReviewData();
      });

      const disagreeRows = await test.step(
        'Disagree Auditor Response rows are present',
        async () => {
          const found =
            await supervisorAgree.findDisagreeAuditorResponseTransactions();
          requireAtLeastOne(
            found,
            'Supervisor Review Data has no rows with Auditor Response = ' +
              'Disagree, so there is nothing for the supervisor to answer.'
          );
          return found;
        }
      );

      const { changedCount } = await test.step(
        `set Supervisor Status to ${MARKED} on ${disagreeRows.length} row(s)`,
        async () => supervisorAgree.setSupervisorStatusForDisagreeRows(MARKED)
      );

      const notification = await test.step(
        'save Supervisor Review Data',
        async () => supervisorAgree.save({ requireEdits: changedCount > 0 })
      );

      await test.step('Record Updated success message', async () => {
        supervisorAgree.expectRecordUpdatedToast(notification);
      });

      await test.step('close Supervisor Review Data', async () => {
        await supervisorAgree.closeSupervisorReviewData();
      });

      await test.step(
        `choose ${APPROVAL_ACTION} from Approval History`,
        async () => {
          await emptyErrorMessage.openApprovalAction(APPROVAL_ACTION);
          await emptyErrorMessage.expectApprovalDialogVisible(APPROVAL_ACTION);
        }
      );

      await test.step(`submit the ${APPROVAL_ACTION}`, async () => {
        await emptyErrorMessage.submitApprovalActionWithComments(
          APPROVAL_ACTION,
          data.comments
        );
        await emptyErrorMessage.expectApprovalActionSubmitted(APPROVAL_ACTION);
      });
    });
  }
});
