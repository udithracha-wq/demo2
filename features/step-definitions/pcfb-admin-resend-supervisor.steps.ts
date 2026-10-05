import { When } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PcfbAdminResendSupervisorPage } from '../../pages/PcfbAdminResendSupervisorPage';

When('I click Send to Supervisor Review', async function (this: CustomWorld) {
  const page = new PcfbAdminResendSupervisorPage(this.page!);
  await page.clickSendToSupervisorReview();
});
