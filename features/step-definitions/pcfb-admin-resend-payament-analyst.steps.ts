import { When } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PcfbAdminResendPaymentAnalystPage } from '../../pages/PcfbAdminResendPaymentAnalystPage';

When('I open the Report Generator tab', async function (this: CustomWorld) {
  const page = new PcfbAdminResendPaymentAnalystPage(this.page!);
  await page.openReportGeneratorTab();
});

When('I click Resend To Payment Analyst', async function (this: CustomWorld) {
  const page = new PcfbAdminResendPaymentAnalystPage(this.page!);
  await page.clickResendToPaymentAnalyst();
});

When(
  'I click Finish on the Report Generator flow',
  async function (this: CustomWorld) {
    const page = new PcfbAdminResendPaymentAnalystPage(this.page!);
    await page.clickFinish();
  }
);

When('I wait and refresh the case', async function (this: CustomWorld) {
  const page = new PcfbAdminResendPaymentAnalystPage(this.page!);
  await page.waitAndRefreshCase();
});
