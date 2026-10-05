import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PcfbAdminGenerateVoucherPage } from '../../pages/PcfbAdminGenerateVoucherPage';

When('I click Generate Voucher Report', async function (this: CustomWorld) {
  const page = new PcfbAdminGenerateVoucherPage(this.page!);
  await page.clickGenerateVoucherReport();
});

Then(
  'I should see a Generate Voucher Report success message',
  async function (this: CustomWorld) {
    const page = new PcfbAdminGenerateVoucherPage(this.page!);
    await page.expectGenerateVoucherReportSuccess();
  }
);
