---
name: automation-setup
description: Sets up a BDD-only Playwright + Cucumber framework with Page Object Model, VS Code extensions, codegen workflow, Allure, and Cucumber config. Use when the user asks to install, scaffold, create, or configure the automation framework, Playwright BDD, Cucumber, or codegen recording.
---

# Automation Setup

Read and follow the full guide: [`automation_setup_prompt.md`](../../../automation_setup_prompt.md)

## Architecture

```
Feature Files → Step Definitions → Page Objects
```

BDD-only — no separate Playwright `.spec.ts` suite for new coverage.

## Workflow checklist

Copy and track:

```
Setup Progress:
- [ ] STEP 1: Verify VS Code + Node.js (+ optional globals)
- [ ] STEP 2: Install Playwright + Cucumber VS Code extensions
- [ ] STEP 3–4: Codegen recording (ask for URL; wait for Done)
- [ ] STEP 5: Create new OR use existing framework
- [ ] STEP 6: Save codegen under codegen-output/
- [ ] STEP 7–10: Gherkin scenario + feature file + tags
- [ ] STEP 11: Step defs + World + hooks; run with auto-heal
```

## New framework scaffold

```
playwright-bdd-framework/
├── .vscode/settings.json       # cucumberautocomplete paths
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── cucumber.js
├── features/
│   ├── *.feature
│   └── step-definitions/
│       ├── *.steps.ts
│       ├── world.ts            # baseURL MUST be here for Cucumber
│       └── hooks.ts
├── pages/
├── support/
├── codegen-output/
└── reports/
```

### Install

```bash
npm init -y
npm install @playwright/test playwright @cucumber/cucumber dotenv allure-playwright
npm install -D typescript @types/node ts-node allure-commandline
npx playwright install
```

### Critical configs

* `.vscode/settings.json` — point `cucumberautocomplete.steps` at `features/step-definitions/**/*.ts`
* `cucumber.js` — `requireModule: ['ts-node/register']`, require step-defs, HTML report under `reports/`
* World `newContext({ baseURL })` — Cucumber ignores Playwright config `baseURL`
* Video recording in context for passed and failed runs

### Extensions

```bash
code --install-extension ms-playwright.playwright
code --install-extension alexkrechik.cucumberautocomplete
```

## Interactive gates

Ask before proceeding when the prompt requires user input:

* Recording URL
* Create new vs use existing framework
* Recording complete (Yes/Done)
* New vs existing feature file
* Tags (`@Regression`, `@Sanity`, `@End_to_End`, feature tags)

## After setup

Point the user at skills `script-generation` (new tests) and `test-debugging` (failures).
