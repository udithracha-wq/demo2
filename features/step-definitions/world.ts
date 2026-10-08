import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  Page,
  chromium,
} from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceLoginPage } from '../../pages/SalesforceLoginPage';
import type {
  ContributorCodeChange,
  ReportRow,
} from '../../pages/RepeatContributorCodePage';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * CRITICAL: baseURL for Cucumber must live here.
 * Cucumber does NOT use playwright.config.ts baseURL.
 */
const BASE_URL = process.env.BASE_URL || 'https://example.com';

/** Per-step result collected by AfterStep for failure progress reports */
export type StepProgress = {
  text: string;
  keyword: string;
  status: string;
  error?: string;
};

export class CustomWorld extends World {
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;

  /** Shared scenario data — extend as needed */
  testData: Record<string, string> = {};

  /**
   * Soft failures: recorded without aborting the scenario so later steps still
   * run. The After hook rethrows them so the scenario still fails overall.
   */
  softFailures: string[] = [];

  /** Step-by-step progress for the current scenario (used on failure) */
  stepProgress: StepProgress[] = [];

  /**
   * Findings collected during the scenario (empty scans, counts changed).
   * Printed in the terminal summary even when the scenario passes.
   */
  runObservations: string[] = [];

  /** Repeat Contributor Code align results for the current scenario */
  contributorCodeChanges: ContributorCodeChange[] = [];

  /** Cached report scan from align (used to skip verify re-scan when clean) */
  scannedContributorRows: ReportRow[] | null = null;

  constructor(options: IWorldOptions) {
    super(options);
  }

  recordObservation(note: string): void {
    this.runObservations.push(note);
    console.log(`Observation: ${note}`);
  }

  async init(): Promise<void> {
    const headless = process.env.HEADLESS !== 'false';
    const slowMo = Number(process.env.SLOW_MO || 0);
    const authPath = SalesforceLoginPage.authStatePath();
    const storageState = fs.existsSync(authPath) ? authPath : undefined;

    this.browser = await chromium.launch({ headless, slowMo });
    this.context = await this.browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos' },
      ignoreHTTPSErrors: true,
      storageState,
    });
    this.page = await this.context.newPage();
  }

  async cleanup(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
