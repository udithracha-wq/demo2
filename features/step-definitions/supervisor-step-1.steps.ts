import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { SupervisorStep1Page } from '../../pages/SupervisorStep1Page';

When('I search for and open account {string}', async function (
  this: CustomWorld,
  accountName: string
) {
  const page = new SupervisorStep1Page(this.page!);
  this.testData.accountName = accountName;
  await page.searchAndOpenAccount(accountName);
});

When(
  'I open the case with record type {string} from the Cases panel',
  async function (this: CustomWorld, recordType: string) {
    const page = new SupervisorStep1Page(this.page!);
    const caseNumber = await page.openCaseFromCasesCard(recordType);

    this.testData.caseNumber = caseNumber;
    this.testData.caseRecordType = recordType;
    console.log(`Opened case ${caseNumber} (${recordType}) from the Cases panel.`);
  }
);

Then(
  'the case should have record type {string} and status {string}',
  async function (this: CustomWorld, recordType: string, status: string) {
    const page = new SupervisorStep1Page(this.page!);
    await page.expectCaseRecordTypeAndStatus(recordType, status);
    this.testData.caseStatus = status;
  }
);

Then(
  'the Primary Auditor field should not already be {string}',
  async function (this: CustomWorld, auditorName: string) {
    const page = new SupervisorStep1Page(this.page!);
    await page.expectPrimaryAuditorNotAlreadySet(auditorName);
  }
);

Then(
  'the Primary Auditor field should show {string}',
  async function (this: CustomWorld, auditorName: string) {
    const page = new SupervisorStep1Page(this.page!);
    await page.expectPrimaryAuditorValue(auditorName);
  }
);
