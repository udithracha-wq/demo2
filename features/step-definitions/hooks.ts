import {
  Before,
  After,
  Status,
  ITestCaseHookParameter,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from './world';

// Salesforce login + Lightning flows need far more than the 5s default
setDefaultTimeout(180_000);

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const page = this.page;
  const context = this.context;

  if (page && scenario.result?.status === Status.FAILED) {
    const screenshotsDir = path.resolve('test-results/screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });
    const safeName = scenario.pickle.name.replace(/[^a-z0-9-_]/gi, '_');
    const screenshotPath = path.join(screenshotsDir, `${safeName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await this.attach(fs.readFileSync(screenshotPath), 'image/png');
  }

  // Close page first so video is finalized, then attach if present
  const video = page?.video();
  await page?.close();

  if (video) {
    try {
      const videoPath = await video.path();
      if (videoPath && fs.existsSync(videoPath)) {
        await this.attach(fs.readFileSync(videoPath), 'video/webm');
      }
    } catch {
      // Video may be unavailable if recording failed
    }
  }

  await context?.close();
  await this.browser?.close();
  this.page = null;
  this.context = null;
  this.browser = null;
});
