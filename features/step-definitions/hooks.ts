import {
  Before,
  After,
  AfterStep,
  Status,
  ITestCaseHookParameter,
  ITestStepHookParameter,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld, StepProgress } from './world';

// Salesforce login + multi-flag Repeat Contributor flows need a long budget
// Large Duplicate Transaction cases can clear 30+ flags (many minutes).
setDefaultTimeout(1_800_000);

type PickleStepLike = {
  text: string;
  type?: 'Unknown' | 'Context' | 'Action' | 'Outcome';
};

function stepKeyword(step: PickleStepLike): string {
  switch (step.type) {
    case 'Context':
      return 'Given';
    case 'Action':
      return 'When';
    case 'Outcome':
      return 'Then';
    default:
      return 'And';
  }
}

function formatStepLine(index: number, keyword: string, text: string): string {
  return `  ${index}. ${keyword} ${text}`;
}

/**
 * Builds a human-readable progress report for a failed scenario:
 * which steps passed, where it stopped, why (if known), and what is still left.
 */
export function buildFailureProgressReport(
  scenarioName: string,
  pickleSteps: readonly PickleStepLike[],
  stepProgress: StepProgress[],
  softFailures: string[],
  scenarioError?: unknown
): string {
  const lines: string[] = [
    '',
    '════════════════════════════════════════════════════════════',
    'SCENARIO FAILURE PROGRESS REPORT',
    `Scenario: ${scenarioName}`,
    '════════════════════════════════════════════════════════════',
    '',
  ];

  const passed = stepProgress.filter((s) => s.status === Status.PASSED);
  const failed = stepProgress.filter(
    (s) =>
      s.status === Status.FAILED ||
      s.status === Status.AMBIGUOUS ||
      s.status === Status.UNDEFINED
  );
  const skipped = stepProgress.filter(
    (s) => s.status === Status.SKIPPED || s.status === Status.PENDING
  );

  if (passed.length > 0) {
    lines.push(`✓ CHECKS / STEPS PASSED (${passed.length}):`);
    stepProgress.forEach((s, i) => {
      if (s.status === Status.PASSED) {
        lines.push(formatStepLine(i + 1, s.keyword, s.text));
      }
    });
    lines.push('');
  } else {
    lines.push('✓ CHECKS / STEPS PASSED: (none — failed at the first step)');
    lines.push('');
  }

  const stop = failed[0] ?? skipped[0];
  if (stop) {
    const stopIndex = stepProgress.indexOf(stop) + 1;
    lines.push('✗ STOPPED AT:');
    lines.push(formatStepLine(stopIndex, stop.keyword, stop.text));
    const reason =
      stop.error ||
      (scenarioError instanceof Error
        ? scenarioError.message
        : scenarioError
          ? String(scenarioError)
          : undefined);
    if (reason) {
      lines.push('  Reason:');
      for (const reasonLine of reason.split('\n')) {
        lines.push(`    ${reasonLine}`);
      }
    } else {
      lines.push('  Reason: (not available — check screenshot/video)');
    }
    lines.push('');
  } else if (softFailures.length > 0) {
    lines.push('✗ STOPPED AT: soft-failed check(s) (scenario steps finished)');
    lines.push('  Reason:');
    for (const soft of softFailures) {
      for (const reasonLine of soft.split('\n')) {
        lines.push(`    ${reasonLine}`);
      }
    }
    lines.push('');
  } else {
    lines.push('✗ STOPPED AT: (unknown — see Cucumber error below)');
    if (scenarioError) {
      const reason =
        scenarioError instanceof Error
          ? scenarioError.message
          : String(scenarioError);
      lines.push('  Reason:');
      for (const reasonLine of reason.split('\n')) {
        lines.push(`    ${reasonLine}`);
      }
    }
    lines.push('');
  }

  if (softFailures.length > 0 && stop) {
    lines.push(`⚠ SOFT FAILURES RECORDED (${softFailures.length}):`);
    softFailures.forEach((soft, i) => {
      lines.push(`  ${i + 1}. ${soft.split('\n')[0]}`);
    });
    lines.push('');
  }

  // Everything after the stop point still needs to run / be verified.
  const stopIndex = stop ? stepProgress.indexOf(stop) : -1;
  const remainingStart =
    stopIndex >= 0 ? stopIndex + 1 : stepProgress.length;
  const remainingLines: string[] = [];
  for (let i = remainingStart; i < pickleSteps.length; i++) {
    const fromProgress = stepProgress[i];
    if (fromProgress) {
      remainingLines.push(
        formatStepLine(i + 1, fromProgress.keyword, fromProgress.text)
      );
    } else {
      remainingLines.push(
        formatStepLine(i + 1, stepKeyword(pickleSteps[i]), pickleSteps[i].text)
      );
    }
  }

  if (remainingLines.length > 0) {
    lines.push(`○ STILL NEED TO RUN / VERIFY (${remainingLines.length}):`);
    lines.push(...remainingLines);
    lines.push('');
  } else if (softFailures.length === 0) {
    lines.push('○ STILL NEED TO RUN / VERIFY: (none — all steps were attempted)');
    lines.push('');
  } else {
    lines.push(
      '○ STILL NEED TO RUN / VERIFY: (none — all steps ran; fix soft failures above)'
    );
    lines.push('');
  }

  lines.push('════════════════════════════════════════════════════════════');
  lines.push('');
  return lines.join('\n');
}

Before(async function (this: CustomWorld) {
  this.stepProgress = [];
  this.softFailures = [];
  await this.init();
});

AfterStep(async function (this: CustomWorld, step: ITestStepHookParameter) {
  const { pickleStep, result, error } = step;
  const errMsg =
    (error instanceof Error && error.message) ||
    (typeof error === 'string' ? error : undefined) ||
    result.message ||
    undefined;

  this.stepProgress.push({
    text: pickleStep.text,
    keyword: stepKeyword(pickleStep),
    status: result.status,
    error: errMsg,
  });
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const page = this.page;
  const context = this.context;
  const softFailures = [...this.softFailures];
  const failed =
    scenario.result?.status === Status.FAILED || softFailures.length > 0;

  if (failed) {
    const report = buildFailureProgressReport(
      scenario.pickle.name,
      scenario.pickle.steps,
      this.stepProgress,
      softFailures,
      scenario.error ?? scenario.result?.message
    );
    // Always visible in the terminal (progress-bar formatter hides step detail)
    console.log(report);
    await this.attach(report, 'text/plain');
  }

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
    const report = buildFailureProgressReport(
      scenario.pickle.name,
      scenario.pickle.steps,
      this.stepProgress,
      softFailures,
      scenario.error ?? scenario.result?.message
    );
    throw new Error(
      `${softFailures.length} soft-failed check(s) after the rest of the ` +
        `scenario ran:\n\n${softFailures.join('\n\n')}\n${report}`
    );
  }
});
