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

// Salesforce login + multi-flag Repeat Contributor flows need a long budget
// Large Duplicate Transaction cases can clear 30+ flags (many minutes).
setDefaultTimeout(1_800_000);

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const page = this.page;
  const context = this.context;
  const softFailures = [...this.softFailures];
  const failed =
    scenario.result?.status === Status.FAILED || softFailures.length > 0;

  if (page && failed) {
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

  // Soft failures (e.g. Election Type defect) must still fail the scenario
  // after later steps have been given a chance to run.
  if (softFailures.length > 0) {
    throw new Error(
      `${softFailures.length} soft-failed check(s) after the rest of the ` +
        `scenario ran:\n\n${softFailures.join('\n\n')}`
    );
  }
});
