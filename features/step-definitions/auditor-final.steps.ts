import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { AuditorFinalPage } from '../../pages/AuditorFinalPage';

When('I generate the Rejected Claims report', async function (
  this: CustomWorld
) {
  const page = new AuditorFinalPage(this.page!);
  const result = await page.generateRejectedClaimsReport();
  this.testData.rejectedClaimsDownload = result.downloadName;
  this.testData.rejectedClaimsMessage = result.message;
});

When('I generate the All Claims Report', async function (this: CustomWorld) {
  const page = new AuditorFinalPage(this.page!);
  const result = await page.generateAllClaimsReport();
  this.testData.allClaimsDownload = result.downloadName;
  this.testData.allClaimsMessage = result.message;
});

When('I generate the Eligibility Report', async function (this: CustomWorld) {
  const page = new AuditorFinalPage(this.page!);
  const result = await page.generateEligibilityReport();
  this.testData.eligibilityDownload = result.downloadName;
  this.testData.eligibilityMessage = result.message;
});

Then('I should report the collected report messages', async function (
  this: CustomWorld
) {
  const rows: Array<[string, string, string]> = [
    [
      'Rejected Claims',
      this.testData.rejectedClaimsMessage || '(none)',
      this.testData.rejectedClaimsDownload || '(no download)',
    ],
    [
      'All Claims Report',
      this.testData.allClaimsMessage || '(none)',
      this.testData.allClaimsDownload || '(no download)',
    ],
    [
      'Eligibility Report',
      this.testData.eligibilityMessage || '(none)',
      this.testData.eligibilityDownload || '(no download)',
    ],
  ];

  console.log('');
  console.log('Collected report messages:');
  for (const [label, message, download] of rows) {
    console.log(`  - ${label}: ${message}`);
    console.log(`    download: ${download}`);
  }
});
