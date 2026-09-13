import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { SalesforceLoginPage } from '../../pages/SalesforceLoginPage';
import { Auditor1Page } from '../../pages/Auditor1Page';

Given('I am logged into NYselections Lightning', async function (
  this: CustomWorld
) {
  const loginPage = new SalesforceLoginPage(this.page!);
  await loginPage.ensureLoggedIn();
  await loginPage.persistSession();
});

When('I open case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  this.testData.caseNumber = caseNumber;
  await auditor1Page.openCase(caseNumber);
});

When('I open the Details tab', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.openDetailsTab();
});

When('I set Primary Auditor to {string}', async function (
  this: CustomWorld,
  auditorName: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.setPrimaryAuditor(auditorName);
});

When('I open the Eligibility Dashboard tab', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.openEligibilityDashboardTab();
});

When('I select {string} for party selection', async function (
  this: CustomWorld,
  party: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.selectParty(party);
});

When('I select {string} for party selection if present', async function (
  this: CustomWorld,
  party: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.selectPartyIfPresent(party);
});

When('I click Next', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.clickNext();
});

When('I click Next if present', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.clickNextIfPresent();
});

When('I complete the eligibility questionnaire answering Yes', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.completeEligibilityQuestionnaireAllYes();
});

Then('I should see case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectCaseVisible(caseNumber);
});
