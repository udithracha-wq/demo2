# Functional and Automation Utility Setup Prompt

## Overview
This prompt guides the setup of a complete **BDD-only automation framework** using VS Code, Playwright, and Cucumber with Page Object Model design pattern.

**Framework Architecture:**
```
Feature Files → Step Definitions → Page Objects
   (WHAT)          (GLUE)            (HOW)
```

**Key Principles:**
- BDD-only approach (NO separate Playwright .spec.ts tests)
- All tests run via Cucumber feature files
- Step definitions call Page Object methods
- Page Objects contain all locators and actions with fluent waits

The process includes installation, recording, code generation, and test execution.

## Prerequisites
- Windows/Linux/MacOS system
- Internet connection for downloads
- Administrator/sudo privileges (if required for installations)

---

## Step-by-Step Execution Guide

### STEP 1: Install VS Code and Dependencies
**Objective:** Ensure VS Code is installed with all necessary Node.js modules and dependencies.

**Actions:**
1. Check if VS Code is installed:
   - Windows: Check `C:\Program Files\Microsoft VS Code\Code.exe` or check via `code --version` command
   - Linux: Check via `code --version` command
   - MacOS: Check via `code --version` command or check Applications folder

2. If VS Code is NOT installed:
   - Download VS Code from https://code.visualstudio.com/
   - Install VS Code (silent installation if possible)
   - Add VS Code to PATH if not automatically added

3. Verify Node.js installation:
   - Run: `node --version`
   - Run: `npm --version`
   - If not installed, download and install Node.js LTS version from https://nodejs.org/

4. Install global dependencies (if needed):
   - `npm install -g playwright`
   - `npm install -g @cucumber/cucumber`
   - `npm install -g typescript` (if using TypeScript)
   - `npm install -g allure-commandline` (for Allure reports)

5. **Memory Note:** Save installation paths and versions to project memory file.

---

### STEP 2: Install Codegen Plugin and Cucumber Extension
**Objective:** Install the Playwright Codegen extension and Cucumber Autocomplete extension in VS Code.

**Actions:**
1. Check if Codegen plugin is installed:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
   - Search for "Playwright Test for VSCode" or "Playwright Codegen"
   - Verify installation status

2. If NOT installed:
   - Install "Playwright Test for VSCode" extension (by Microsoft)
   - Alternative: Install via command line: `code --install-extension ms-playwright.playwright`

3. **CRITICAL - Install Cucumber Autocomplete Extension:**
   - Check if Cucumber extension is installed: `code --list-extensions | grep -i cucumber`
   - If NOT installed, install "Cucumber (Gherkin) Full Support" extension:
     - Extension ID: `alexkrechik.cucumberautocomplete`
     - Install via command line: `code --install-extension alexkrechik.cucumberautocomplete`
   - This extension enables:
     - Ctrl+Click navigation from feature file steps to step definitions
     - Autocomplete suggestions for Gherkin steps
     - Syntax highlighting for .feature files
     - Step definition generation

4. Verify installation:
   - Check both extensions are enabled
   - Verify Playwright commands are available in Command Palette (Ctrl+Shift+P / Cmd+Shift+P)

5. **Memory Note:** Record extension IDs and versions in project memory file.

---

### STEP 3: Record Screencast with Validations
**Objective:** Guide user to record their test scenario using Playwright Codegen.

**Actions:**
1. Prompt user: "Please provide the URL where you want to record the test steps:"
   - Wait for user input
   - Validate URL format (must start with http:// or https://)
   - If invalid, ask again with format example

2. Once valid URL is provided:
   - Open VS Code terminal
   - Run: `npx playwright codegen <USER_PROVIDED_URL>`
   - This will open a browser window with Playwright Inspector

3. Provide instructions to user:
   - "A browser window has opened. Please perform the following actions:"
   - "1. Navigate through your application"
   - "2. Click on elements, fill forms, and perform all test steps"
   - "3. The code will be generated automatically in the Playwright Inspector"
   - "4. All your interactions will be recorded"

4. Monitor for user confirmation:
   - Wait for user to say "Done" or "Finished recording" or similar confirmation
   - If user needs help, provide guidance on using Codegen

5. **Memory Note:** Save the URL and recording timestamp to project memory file.

---

### STEP 4: Confirm Recording Completion
**Objective:** Ensure user has finished recording before proceeding.

**Actions:**
1. Prompt user: "Have you completed the recording? Please type 'Yes' or 'Done' to proceed, or 'No' if you need to record more steps."

2. If user says "No" or "Not yet":
   - Allow them to continue recording
   - Wait for confirmation again

3. If user confirms "Yes" or "Done":
   - Capture the generated code from Playwright Inspector
   - Save the codegen output to a temporary file
   - Proceed to next step

4. **Memory Note:** Record completion status and any notes from user in project memory file.

---

### STEP 5: Create or Use Existing Playwright BDD Framework
**Objective:** Set up Playwright BDD framework with Page Object Model design pattern.

**Actions:**
1. Prompt user: "Do you want to create a NEW Playwright BDD framework or use an EXISTING one? Please reply with 'Create new' or 'Use existing'."

2. **If user replies "Use existing":**
   - Prompt: "Please open the existing framework folder in Cursor/VS Code. Once opened, let me know and I will proceed."
   - Wait for user confirmation that folder is open
   - Verify framework structure:
     - Check for `package.json`
     - Check for Playwright config file (`playwright.config.ts` or `playwright.config.js`)
     - Check for BDD setup (Cucumber/Gherkin files)
     - Check for Page Object Model structure
     - Check for Allure configuration and dependencies
   - If structure is incomplete, inform user and ask if they want to enhance it
   - **Important:** Verify that existing Page Object Model classes and methods are available for reuse

3. **If user replies "Create new":**
   - Create new directory structure:
     ```
     playwright-bdd-framework/
     ├── .vscode/
     │   └── settings.json          # CRITICAL: Cucumber extension settings
     ├── package.json
     ├── playwright.config.ts
     ├── tsconfig.json (if using TypeScript)
     ├── cucumber.js                 # CRITICAL: Cucumber configuration
     ├── features/
     │   ├── *.feature              # Gherkin feature files
     │   └── step-definitions/      # CRITICAL: Cucumber step definitions
     │       ├── *.steps.ts         # Step definition files (login.steps.ts, etc.)
     │       ├── world.ts           # Cucumber World class with Playwright
     │       └── hooks.ts           # Before/After hooks for Cucumber
     ├── pages/                     # Page Object Model classes
     ├── tests/                     # Playwright spec files (optional)
     ├── support/
     │   ├── hooks.ts               # Playwright test fixtures
     │   └── testData.ts            # Test data configuration
     ├── codegen-output/            # Recorded codegen files
     └── reports/
     ```
   - Initialize npm project: `npm init -y`
   - Install dependencies:
     - `npm install @playwright/test playwright`
     - `npm install @cucumber/cucumber`
     - `npm install -D typescript @types/node ts-node` (if using TypeScript)
     - `npm install allure-playwright` (for Allure report integration)
     - `npm install -D allure-commandline` (for Allure report generation)
     - `npm install dotenv` (for environment variables)
   - Create basic Playwright config with BDD support and Allure configuration
   - Create basic Page Object Model structure
   - Configure Playwright to capture videos for all tests (both passed and failed)
   - **CRITICAL: Create VS Code settings for Cucumber extension:**
     ```json
     // .vscode/settings.json
     {
       "cucumberautocomplete.steps": [
         "features/step-definitions/**/*.ts",
         "features/step-definitions/**/*.js"
       ],
       "cucumberautocomplete.syncfeatures": "features/**/*.feature",
       "cucumberautocomplete.strictGherkinCompletion": false,
       "cucumberautocomplete.smartSnippets": true,
       "cucumberautocomplete.stepsInvariants": true
     }
     ```
   - **CRITICAL: Create cucumber.js configuration:**
     ```javascript
     // cucumber.js
     module.exports = {
       default: {
         requireModule: ['ts-node/register'],
         require: ['features/step-definitions/**/*.ts'],
         format: ['progress-bar', 'html:reports/cucumber-report.html'],
         formatOptions: { snippetInterface: 'async-await' },
         publishQuiet: true
       }
     };
     ```
   - Open the new framework folder in Cursor using: `cursor <framework-path>` or open manually in Cursor

4. **Memory Note:** Save framework path, structure, and dependencies to project memory file.

---

### STEP 6: Copy Codegen File and Additional Files
**Objective:** Organize codegen output and gather additional files for test generation.

**Actions:**
1. Ensure the framework folder is open in Cursor:
   - If not already open, open the framework folder in Cursor using: `cursor <framework-path>` or open manually
   - Verify the folder is accessible in Cursor

2. Create a folder in the Playwright framework:
   - Name: `codegen-output` or `recordings` (ask user preference or use default)
   - Location: Root of framework or in a `temp` folder

3. Copy the codegen file (saved from Step 4) to this folder:
   - File name: `codegen-recording-<timestamp>.ts` or `.js`
   - Preserve all generated code

4. Prompt user: "Do you want to add any additional files to generate test cases and automation scripts? (e.g., API specifications, data files, screenshots, etc.) Please provide file paths or type 'No' to proceed."

5. If user provides files:
   - Copy all provided files to the codegen folder
   - List all files added for user confirmation

6. If user says "No":
   - Proceed with just the codegen file

7. **Memory Note:** Record all file paths and names in project memory file.

---

### STEP 7: Generate BDD Scenario from Codegen
**Objective:** Convert codegen output into a BDD (Gherkin) scenario.

**Actions:**
1. Read the codegen file and analyze:
   - Extract all actions (click, fill, select, etc.)
   - Identify page elements and selectors
   - Map actions to user-friendly steps
   - Identify navigation flows

2. Generate BDD scenario structure:
   ```gherkin
   Feature: [Feature Name]
     Scenario: [Scenario Name]
       Given [Initial state]
       When [Action 1]
       And [Action 2]
       Then [Expected result]
   ```

3. Convert codegen actions to BDD steps:
   - Map Playwright actions to Given/When/Then/And/But steps
   - Use natural language descriptions
   - Include element descriptions where relevant

4. If any step is missing information or unclear:
   - Add placeholder: `<Please provide information here>`
   - Mark the step with a comment: `# TODO: User input required`

5. Display the generated scenario to user for review:
   - Show the complete Gherkin scenario
   - Highlight any steps with `<Please provide information here>`
   - Ask user to review and confirm

6. **Memory Note:** Save generated scenario draft to project memory file.

---

### STEP 8: Handle Missing Information
**Objective:** Ensure all BDD steps are complete and meaningful.

**Actions:**
1. Scan generated scenario for placeholders: `<Please provide information here>`

2. For each placeholder found:
   - Prompt user: "Step [X] needs more information: [Show the step]. Please provide the missing details."
   - Wait for user input
   - Replace placeholder with user-provided information

3. Validate all steps make sense:
   - Check for logical flow
   - Verify step descriptions are clear
   - Ensure Given/When/Then structure is correct

4. If steps still don't make sense after user input:
   - Ask user to clarify or rephrase
   - Offer suggestions based on codegen actions

5. **Memory Note:** Record all user clarifications in project memory file.

---

### STEP 9: Add Scenario to Feature File
**Objective:** Save the generated scenario to an appropriate feature file.

**Actions:**
1. Prompt user: "Do you want to add this scenario to a NEW feature file or an EXISTING feature file? Please reply with 'New' or 'Existing'."

2. **If user replies "New":**
   - Ask for feature file name (e.g., "login.feature", "checkout.feature")
   - Validate name (must end with .feature)
   - Create new file in `features/` directory
   - Add the scenario to the new file
   - Include basic feature description

3. **If user replies "Existing":**
   - List all existing feature files in `features/` directory
   - Ask user to select which file to use
   - Read the existing file
   - Append the new scenario to the file (with proper spacing)
   - Preserve existing content

4. **Memory Note:** Record feature file name and location in project memory file.

---

### STEP 10: Add Tags to Scenario
**Objective:** Tag the scenario for test categorization.

**Actions:**
1. Prompt user: "Please provide relevant tags for this scenario. Available options: @Regression, @Sanity, @End_to_End. You can provide multiple tags separated by commas, or type 'Skip' to proceed without tags."

2. If user provides tags:
   - Validate tag format (should start with @)
   - Add tags above the scenario in the feature file:
     ```gherkin
     @Regression @Sanity
     Scenario: [Scenario Name]
     ```
   - If user provides tags without @, add @ prefix automatically

3. If user says "Skip":
   - Proceed without tags (or add a default tag like @Generated)

4. **Memory Note:** Record tags applied to scenario in project memory file.

---

### STEP 11: Create Step Definitions and Execute Scenario with Auto-Healing
**Objective:** Create Cucumber step definitions that link to feature files, run the BDD scenario, auto-heal failures, and generate Allure report with video screencast.

**Actions:**
1. **CRITICAL: Create Cucumber Step Definitions (NOT just Playwright test specs):**
   - **This is the most important step for BDD integration!**
   - Step definitions are what link Gherkin steps in .feature files to actual code
   - Without proper step definitions, Ctrl+Click navigation will NOT work in feature files
   
   **Step Definition Structure:**
   ```typescript
   // features/step-definitions/login.steps.ts
   import { Given, When, Then } from '@cucumber/cucumber';
   import { expect } from '@playwright/test';
   import { LoginPage } from '../../pages/LoginPage';
   import { CustomWorld } from './world';

   Given('I am logged into the application', async function (this: CustomWorld) {
     const loginPage = new LoginPage(this.page!);
     await loginPage.navigateToLoginPage();
     await loginPage.login('username', 'password');
   });

   When('I click on {string}', async function (this: CustomWorld, buttonName: string) {
     await this.page!.getByRole('button', { name: buttonName }).click();
   });

   Then('I should see {string}', async function (this: CustomWorld, text: string) {
     await expect(this.page!.getByText(text)).toBeVisible();
   });
   ```

   **World Class (features/step-definitions/world.ts):**
   ```typescript
   import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
   import { Browser, BrowserContext, Page, chromium } from '@playwright/test';

   /**
    * CRITICAL: Base URL for the application
    * This MUST be set here because Cucumber does NOT use playwright.config.ts baseURL
    * Without this, page.goto('/path') will fail with "Cannot navigate to invalid URL"
    */
   const BASE_URL = 'https://your-application-url.com';

   export class CustomWorld extends World {
     browser: Browser | null = null;
     context: BrowserContext | null = null;
     page: Page | null = null;
     
     // Store test data between steps
     workOrderNumber: string = '';
     submitterName: string = '';

     constructor(options: IWorldOptions) {
       super(options);
     }

     async init() {
       this.browser = await chromium.launch({ headless: false, slowMo: 100 });
       this.context = await this.browser.newContext({
         baseURL: BASE_URL,  // CRITICAL: Must set baseURL here for Cucumber!
         viewport: { width: 1920, height: 1080 },
         recordVideo: { dir: 'test-results/videos' },
         ignoreHTTPSErrors: true
       });
       this.page = await this.context.newPage();
     }

     async cleanup() {
       await this.page?.close();
       await this.context?.close();
       await this.browser?.close();
     }
   }

   setWorldConstructor(CustomWorld);
   ```
   
   **⚠️ CRITICAL NOTE (BDD-ONLY FRAMEWORK):** Since this framework uses BDD-only approach, the `baseURL` MUST be set in the World class `newContext()` options (not in `playwright.config.ts`). The config file's `baseURL` is not read by Cucumber runner. This is a common mistake that causes "Cannot navigate to invalid URL" errors.

   **Hooks (features/step-definitions/hooks.ts):**
   ```typescript
   import { Before, After } from '@cucumber/cucumber';
   import { CustomWorld } from './world';

   Before(async function (this: CustomWorld) {
     await this.init();
   });

   After(async function (this: CustomWorld) {
     await this.cleanup();
   });
   ```

2. **CRITICAL: Page Object Model Reuse Requirement:**
   - Before creating any new methods, scan existing Page Object Model classes in the `pages/` directory
   - Check if methods already exist that can handle the required actions
   - **DO NOT generate new methods if existing methods can be reused**
   - Reuse existing Page Object methods by calling them from step definitions
   - Only create new Page Object methods if no existing method can perform the required action
   - Document which existing methods were reused in the step definitions
   
3. **Create step definition files for EACH feature:**
   - Create step definition files in `features/step-definitions/` directory
   - Name files descriptively: `login.steps.ts`, `work-order.steps.ts`, etc.
   - Map each Gherkin step to Playwright code using existing Page Object Model methods
   - Use Page Object Model for all element interactions (never use direct selectors in step definitions)
   - Implement proper waits and error handling

4. **Verify Ctrl+Click Navigation Works:**
   - After creating step definitions, reload VS Code (Ctrl+Shift+P → "Reload Window")
   - Open a .feature file and try Ctrl+Click on a step
   - If navigation doesn't work, verify:
     - `.vscode/settings.json` has correct `cucumberautocomplete.steps` path
     - Step definition regex matches the Gherkin step exactly
     - Cucumber extension is installed and enabled

2. Execute scenario step by step:
   - Configure Playwright to capture videos for all tests (both passed and failed):
     - Ensure `playwright.config.ts` has `video: 'on'` or `video: 'retain-on-failure'` set to capture videos for all tests
     - For Allure integration, set `video: 'on'` to capture videos even for passed tests
   - Run BDD scenarios: `npm run bdd` or `npm run bdd:tags @TagName`
   - Enable step-by-step mode if available
   - Capture execution logs

3. Auto-healing process:
   - If a step fails:
     a. Analyze the failure (element not found, timeout, etc.)
     b. Try alternative selectors or strategies
     c. Add explicit waits if needed
     d. Update Page Object if element structure changed
     e. Retry the step
   - Continue until step passes or max retries reached
   - Log all healing attempts

4. Generate Allure report:
   - **CRITICAL: Allure Report with Video Requirement:**
     - Allure reports MUST be generated after every test/suite execution
     - Videos MUST be attached to Allure reports for both passed and failed tests
     - Configure Allure to capture and attach videos automatically
   - Steps to generate Allure report:
     a. Run BDD scenarios (generates Allure results): `npm run bdd`
     b. Generate Allure report: `npm run allure:generate` or `allure generate allure-results --clean`
     c. Open Allure report: `npm run allure:open` or `allure open allure-report`
   - Configure Playwright config to use Allure reporter:
     ```typescript
     reporter: [
       ['allure-playwright', { outputFolder: 'allure-results' }],
       ['html']
     ]
     ```
   - Ensure Allure report includes:
     - Test execution status (Pass/Fail)
     - Screenshots for each step (automatically attached)
     - Video/screencast recording (attached for both passed and failed tests)
     - Error messages and stack traces
     - Execution time
     - Step-by-step execution details
     - Page Object Model method calls used

5. Attach videos to Allure report:
   - Locate video files from test execution (stored in `test-results/` directory)
   - Configure Allure to automatically attach videos:
     - Videos should be attached via Allure attachments API in hooks or step definitions
     - Use `allure.attachment()` to attach video files
     - Ensure videos are attached for both passed and failed tests
   - If Playwright video is available, attach it to Allure report
   - Ensure Allure report links to videos for each test case

6. **Final Output:**
   - Display Allure report location to user
   - Show summary: Passed/Failed steps
   - Provide link to detailed Allure report
   - Confirm that videos are attached for all tests (both passed and failed)
   - Save execution results to project memory file

7. **Memory Note:** Record execution results, failures, healing actions, Allure report path, and video attachment status in project memory file.

---

## Memory/History Management

### Memory File Structure
Create and maintain a file: `.automation-memory.json` in the project root with the following structure:

```json
{
  "projectName": "[Project Name]",
  "setupDate": "[ISO Date]",
  "machineInfo": {
    "os": "[OS Version]",
    "nodeVersion": "[Node Version]",
    "vsCodeVersion": "[VS Code Version]"
  },
  "installations": {
    "vsCode": {
      "installed": true,
      "path": "[Path]",
      "version": "[Version]"
    },
    "codegenPlugin": {
      "installed": true,
      "extensionId": "[ID]",
      "version": "[Version]"
    },
    "dependencies": {
      "playwright": "[Version]",
      "cucumber": "[Version]",
      "typescript": "[Version]",
      "allure-playwright": "[Version]",
      "allure-commandline": "[Version]"
    }
  },
  "framework": {
    "type": "new|existing",
    "path": "[Framework Path]",
    "structure": "[Structure Details]"
  },
  "recordings": [
    {
      "url": "[Recorded URL]",
      "timestamp": "[ISO Timestamp]",
      "codegenFile": "[File Path]"
    }
  ],
  "scenarios": [
    {
      "featureFile": "[Feature File Path]",
      "scenarioName": "[Scenario Name]",
      "tags": ["@Tag1", "@Tag2"],
      "generatedDate": "[ISO Date]",
      "executionResults": {
        "status": "passed|failed",
        "executionDate": "[ISO Date]",
        "allureReportPath": "[Allure Report Path]",
        "videoAttached": true,
        "videoPath": "[Video File Path]",
        "healingActions": ["Action 1", "Action 2"],
        "pageObjectMethodsReused": ["Method1", "Method2"]
      }
    }
  ],
  "history": [
    {
      "step": "[Step Number]",
      "action": "[Action Performed]",
      "timestamp": "[ISO Timestamp]",
      "details": "[Additional Details]"
    }
  ]
}
```

### Memory Usage Rules
1. **Before each step:** Read `.automation-memory.json` to understand project state
2. **After each step:** Update `.automation-memory.json` with new information
3. **If memory file doesn't exist:** Create it at the start of Step 1
4. **If project changes:** Update memory file accordingly
5. **Reference memory:** Use memory file to skip redundant steps (e.g., if VS Code is already installed)

---

## Error Handling and Validation

### Common Validations
1. **URL Validation:** Must start with http:// or https://
2. **File Path Validation:** Check if paths exist before operations
3. **Dependency Validation:** Verify all required packages are installed (including Allure)
4. **Framework Validation:** Ensure BDD framework structure is correct
5. **Scenario Validation:** Check Gherkin syntax before saving
6. **Page Object Model Validation:** Verify existing methods are checked before creating new ones
7. **Allure Configuration Validation:** Ensure Allure is configured to capture videos for all tests
8. **Step Definition Validation:** 
   - Verify `features/step-definitions/` directory exists with actual step files
   - Verify `.vscode/settings.json` has `cucumberautocomplete.steps` configured
   - Verify `cucumber.js` configuration file exists
   - Verify `world.ts` and `hooks.ts` exist for Cucumber integration
   - Test Ctrl+Click navigation works on feature file steps after setup

### Error Recovery
1. If installation fails: Provide manual installation instructions
2. If codegen fails: Suggest alternative recording methods
3. If scenario generation fails: Show codegen output and ask for manual input
4. If execution fails: Show detailed error and suggest fixes
5. If auto-healing fails: Report failure and provide manual intervention options

### Troubleshooting: Ctrl+Click Not Working on Feature File Steps

If Ctrl+Click on Gherkin steps in .feature files doesn't navigate to step definitions:

1. **Verify Cucumber Extension is Installed:**
   ```bash
   code --list-extensions | grep -i cucumber
   # Should show: alexkrechik.cucumberautocomplete
   ```

2. **Verify .vscode/settings.json exists with correct configuration:**
   ```json
   {
     "cucumberautocomplete.steps": [
       "features/step-definitions/**/*.ts",
       "features/step-definitions/**/*.js"
     ],
     "cucumberautocomplete.syncfeatures": "features/**/*.feature"
   }
   ```

3. **Verify Step Definition Files Exist:**
   - Check `features/step-definitions/` directory has `.steps.ts` files
   - Each file must import from `@cucumber/cucumber`:
     ```typescript
     import { Given, When, Then } from '@cucumber/cucumber';
     ```

4. **Verify Step Regex Matches Gherkin Step:**
   - Feature file: `When I navigate to the Work Order Creation page`
   - Step definition must match: `When('I navigate to the Work Order Creation page', ...)`

5. **Reload VS Code:**
   - Press `Ctrl+Shift+P` → Type "Reload Window" → Press Enter
   - Extension settings only take effect after reload

6. **Check for Errors:**
   - Open Output panel (View → Output)
   - Select "Cucumber" from dropdown
   - Look for any error messages

7. **Common Mistakes:**
   - Creating Playwright test specs (`.spec.ts`) instead of Cucumber step definitions (`.steps.ts`)
   - Playwright tests use `test()` from `@playwright/test`
   - Cucumber steps use `Given/When/Then` from `@cucumber/cucumber`
   - These are NOT the same thing!

### Troubleshooting: "Cannot navigate to invalid URL" Error

If you see this error when running Cucumber BDD tests:
```
page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
navigating to "/auth/signin", waiting until "load"
```

**Root Cause:** The `baseURL` in `playwright.config.ts` is NOT used by Cucumber tests!

**Solution:** Add `baseURL` to the World class in `features/step-definitions/world.ts`:

```typescript
const BASE_URL = 'https://your-application-url.com';  // Add this!

async init() {
  this.browser = await chromium.launch({ headless: false });
  this.context = await this.browser.newContext({
    baseURL: BASE_URL,  // CRITICAL: Add this line!
    recordVideo: { dir: 'test-results/videos' }
  });
  this.page = await this.context.newPage();
}
```

**Why This Happens:**
- `playwright.config.ts` is only used by `npx playwright test` (Playwright runner)
- Cucumber BDD tests use `cucumber-js` (Cucumber runner), which doesn't read `playwright.config.ts`
- You must manually configure the browser context with the base URL in the World class

### Troubleshooting: Test Failure Analysis

When a test fails, the AI assistant should:

1. **Ask for the Playwright HTML Report Screenshot** - Request user to share screenshot of the Playwright report showing the failure details (localhost:9323)
2. **Analyze the report** - Look at:
   - Which steps passed ✅ and which failed ❌
   - The exact locator/selector that failed
   - The timing (how long it waited before failing)
   - The call stack showing which file/line caused the failure
3. **Explain the root cause** - Tell the user exactly what failed and why BEFORE proposing any fix
4. **Ask for permission** - "Should I fix this issue?"
5. **Request HTML if needed** - If locator issues, ask: "Please copy the HTML of the element from browser DevTools"

**⚠️ CRITICAL WORKFLOW:**
```
1. Test fails
2. Ask user: "Please share a screenshot of the Playwright HTML report showing the failure"
3. Analyze the report screenshot
4. Explain: "The test failed at [step] because [reason]"
5. Ask: "Would you like me to fix this?"
6. Only then implement the fix
```

**Never assume or guess the failure. Always analyze the actual report first.**

### Auto-Fixable Errors (AI Can Fix Without Asking)

These are common errors that the AI assistant can recognize and fix automatically:

#### 1. Strict Mode Violation - Multiple Elements Found

**Error Pattern:**
```
Error: strict mode violation: locator('...') resolved to N elements:
    1) <element1>
    2) <element2>
```

**Auto-Fix Strategy:**
1. Analyze which element is the intended target (usually the interactive one like button, link)
2. Make the XPath/locator more specific by adding parent context:
   ```typescript
   // ❌ BAD - Matches button AND breadcrumb
   page.locator('//span[text()[normalize-space()="Work Order"]]')
   
   // ✅ GOOD - Only matches span inside button
   page.locator('//button//span[text()[normalize-space()="Work Order"]]')
   ```
3. Or use `.first()` / `.last()` / `.nth(index)` if order is predictable

**Common Scenarios:**
- Menu button text matches breadcrumb text → Add `//button//` prefix
- Link text matches heading text → Add `//a//` prefix
- Multiple buttons with same text → Use parent container context

#### 2. Element Not Found After Page Transition

**Error Pattern:**
```
Timeout waiting for selector '...'
(After clicking a button that navigates/closes modal)
```

**Auto-Fix Strategy:**
1. Add `waitForLoadState('domcontentloaded')` or `waitForLoadState('networkidle')`
2. Add explicit wait for URL change: `waitForURL('/expected-path')`
3. Increase timeout for slow transitions

#### 3. Element Not Interactable

**Error Pattern:**
```
Element is not visible
Element is outside viewport
Element is covered by another element
```

**Auto-Fix Strategy:**
1. Add scroll into view: `locator.scrollIntoViewIfNeeded()`
2. Wait for element to be visible: `locator.waitFor({ state: 'visible' })`
3. Check for overlays/modals blocking the element

---

## 🎯 CRITICAL: Locator Strategy and Debugging Guide

This section is the **MOST IMPORTANT** part of this document. Following these rules will prevent 90% of debugging iterations.

### ⚠️ GOLDEN RULE: Codegen Output is the PRIMARY Source of Truth

**NEVER assume or guess locators. ALWAYS use codegen output as the first reference.**

When user provides codegen output, it contains:
1. **Element roles** (button, menuitem, link, textbox, etc.)
2. **Element names/labels** (exact text)
3. **Element structure** (nested elements, parent-child relationships)

**Example - Reading Codegen Output:**
```typescript
// Codegen output provided by user:
await page.getByRole('button', { name: 'Work Order ' }).click();
await page.getByRole('menuitem', { name: 'Work Queue Dashboard' }).click();
await page.getByRole('textbox', { name: 'User ID *' }).fill('username');
```

**What this tells us:**
- "Work Order" is a **button** element
- "Work Queue Dashboard" is a **menuitem** (NOT a button!)
- "User ID" is a **textbox** with label

**Converting Codegen to XPath:**

| Codegen | Correct XPath | Wrong XPath |
|---------|---------------|-------------|
| `getByRole('button', { name: 'Work Order' })` | `//button[.//text()[normalize-space()='Work Order']]` | ❌ `//span[text()='Work Order']` |
| `getByRole('menuitem', { name: 'Dashboard' })` | Check HTML first! Could be `//a`, `//li`, `//button` | ❌ `//button[text()='Dashboard']` |
| `getByRole('textbox', { name: 'Email' })` | `//input[@type='text']` or by label | ❌ `//div[text()='Email']` |

### 📋 Locator Decision Flowchart

```
START: Need to create a locator
          │
          ▼
┌─────────────────────────────────┐
│ 1. Does user provide codegen?   │
└─────────────────────────────────┘
          │
    ┌─────┴─────┐
    │YES        │NO
    ▼           ▼
┌─────────┐  ┌─────────────────────────────┐
│ Use     │  │ ASK USER for codegen or     │
│ codegen │  │ HTML before proceeding      │
│ info    │  │ "Please provide the codegen │
└────┬────┘  │ output or HTML for this     │
     │       │ element"                    │
     ▼       └─────────────────────────────┘
┌─────────────────────────────────┐
│ 2. Convert to XPath using       │
│    element role from codegen    │
│    - button → //button[...]     │
│    - menuitem → check HTML      │
│    - textbox → //input[...]     │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 3. Test fails?                  │
└─────────────────────────────────┘
          │
    ┌─────┴─────┐
    │YES        │NO
    ▼           ▼
┌─────────────┐  ┌─────────┐
│ Analyze     │  │ SUCCESS │
│ error type  │  └─────────┘
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Error: Multiple elements?    │
│    → Add parent context         │
│    //button//span[...] instead  │
│    of just //span[...]          │
├─────────────────────────────────┤
│ 5. Error: Element not found?    │
│    → ASK USER for HTML          │
│    → Create XPath from HTML     │
├─────────────────────────────────┤
│ 6. Error: Timeout?              │
│    → Add fluent waits           │
│    → Check page transitions     │
└─────────────────────────────────┘
```

### 🚫 NEVER DO THIS (Common Mistakes)

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Assume same structure for different elements | "Work Order" (button) ≠ "Work Queue Dashboard" (menuitem) | Check codegen for each element |
| Create XPath without checking codegen | Wastes test runs debugging wrong locators | Always reference codegen first |
| Apply fix pattern from one element to another | Each element has unique structure | Verify structure individually |
| Guess element tag (button, span, div) | Causes multiple failed iterations | Use codegen role or ask for HTML |
| Use generic selectors (.ng-input) | Matches multiple elements | Be specific with context |

### 📝 Correct Workflow for Creating Locators

**Step 1: Check Codegen Output**
```typescript
// User provided codegen:
await page.getByRole('menuitem', { name: 'Work Queue Dashboard' }).click();
```
- Element is `menuitem` role
- Name is "Work Queue Dashboard"

**Step 2: Determine XPath Approach**
- `menuitem` could be `<a>`, `<li>`, `<button>`, or other element
- Since codegen doesn't tell us the exact tag, we have 2 options:
  1. Use Playwright's `getByRole` directly (preferred if it works)
  2. Ask user for HTML to create proper XPath

**Step 3: If Using XPath, Get HTML First**
```
AI: "Please copy the HTML of the 'Work Queue Dashboard' menu item from browser DevTools"

User provides:
<button class="dropdown-item">Work Queue Dashboard</button>
```

**Step 4: Create XPath from HTML**
```typescript
// Now we know it's a button, not a span or link
this.workQueueDashboard = page.locator('//button[text()[normalize-space()="Work Queue Dashboard"]]');
```

### 🔄 When to Ask User for Information

**ALWAYS ask for HTML when:**
1. Codegen role is ambiguous (menuitem, listitem, etc.)
2. Test fails with "element not found"
3. Test fails with "strict mode violation"
4. You need to navigate to child elements (input inside label)
5. Multiple similar elements exist on page

**Request Template:**
```
"Please copy the HTML of the [element description] from browser DevTools:
1. Right-click on the element in the browser
2. Click 'Inspect'
3. In DevTools, right-click on the highlighted element
4. Click 'Copy' → 'Copy outerHTML'
5. Paste it here"
```

### 🎯 XPath Pattern Reference

**Default Pattern (use this first):**
```typescript
// For text content inside any element
//tagname[text()[normalize-space()='Exact Text']]

// For text anywhere in descendants
//tagname[.//text()[normalize-space()='Text']]

// For partial text match
//tagname[contains(text(), 'Partial')]
```

**Scoped Patterns (when multiple elements match):**
```typescript
// Target span INSIDE button (not standalone span)
//button//span[text()[normalize-space()='Work Order']]

// Target link INSIDE nav
//nav//a[text()[normalize-space()='Dashboard']]

// Target input AFTER label
//label[text()[normalize-space()='Email']]/following-sibling::input

// Target first matching element
page.locator('//span[text()="Work Order"]').first()
```

### 🔧 Auto-Fix Decision Matrix

When test fails, AI should follow this matrix:

| Error Type | Error Message Contains | Auto-Fix Action |
|------------|----------------------|-----------------|
| Strict Mode | "resolved to N elements" | Add parent context (//button//span) |
| Timeout | "Timeout waiting for selector" | Add fluent waits, check codegen |
| Not Found | "Element not found" | Ask for HTML, verify codegen |
| Not Visible | "Element is not visible" | Add waitFor visible, scroll into view |
| Covered | "Element is covered" | Wait for overlay to disappear |

### Common Locator Mistakes and Best Practices

These are common issues encountered during test development. Following these practices will reduce debugging iterations.

#### 1. Always Use Regex for Button/Menu Locators

**Problem:** Buttons with icons often have extra spaces or hidden characters.

```typescript
// ❌ BAD - Exact match fails with icons
this.workOrderMenu = page.getByRole('button', { name: 'Work Order ' });
this.doneButton = page.getByRole('button', { name: ' Done' });

// ✅ GOOD - Regex is flexible
this.workOrderMenu = page.getByRole('button', { name: /Work Order/i });
this.doneButton = page.getByRole('button', { name: /Done/i });
```

#### 2. Icon-Only Buttons Have No Accessible Name

**Problem:** Buttons with only icons (no text) cannot be found by `name`.

```yaml
# Accessibility tree shows:
- button "" [ref=e130]   # Empty name!
```

**Solution:** Use position-based locators:
```typescript
// ❌ BAD - Won't find icon-only button
this.selectButton = page.getByRole('button', { name: /Select/i });

// ✅ GOOD - Target by position in parent
this.selectButton = page.locator('tbody tr').first().locator('button').first();
```

#### 3. Generic CSS Selectors Match Multiple Elements

**Problem:** `.ng-input` or `.ng-select-container` may match multiple dropdowns.

```typescript
// ❌ BAD - Too generic, might click wrong dropdown
this.dropdown = page.locator('.ng-input');

// ✅ GOOD - Use specific ID or context
this.sourceDropdown = page.locator('.ng-select-container').first();
this.paymentTypeDropdown = page.locator('#payment-type .ng-select-container');
```

#### 4. Add Waits After Page Transitions

**Problem:** Clicking a button that navigates/closes a modal needs time for the page to settle.

```typescript
// ❌ BAD - Next step fails because page hasn't loaded
async clickDoneButton(): Promise<void> {
  await this.click(this.doneButton);
}

// ✅ GOOD - Wait for page to settle
async clickDoneButton(): Promise<void> {
  await this.click(this.doneButton);
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);  // Allow transition to complete
}
```

#### 5. Dropdowns Need Wait Before and After

**Problem:** Dropdowns need time to open and for options to appear.

```typescript
// ✅ GOOD - Wait for dropdown and options
async selectDeliveryMethod(method: string): Promise<void> {
  await this.deliveryMethodDropdown.waitFor({ state: 'visible', timeout: 10000 });
  await this.deliveryMethodDropdown.click();
  
  const option = this.page.getByRole('option', { name: method, exact: true });
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}
```

#### 6. Default Locator Strategy: XPath (PREFERRED)

**Unless stated otherwise by the user, always use XPath as the default locator strategy.**

**XPath Pattern for Labels/Fields:**
```typescript
// Pattern: //label[text()[normalize-space()='Field Name']]
// Then navigate to input/div/etc. as needed

// ✅ GOOD - XPath with normalize-space() for text matching
this.firstNameLabel = page.locator("//label[text()[normalize-space()='First Name']]");
this.firstNameInput = page.locator("//label[text()[normalize-space()='First Name']]/following-sibling::input");
this.firstNameInput = page.locator("//label[text()[normalize-space()='First Name']]/..//input");

// ✅ GOOD - XPath for buttons/spans with text
this.workOrderMenu = page.locator("//span[text()[normalize-space()='Work Order']]");
this.submitButton = page.locator("//button[text()[normalize-space()='Submit']]");
this.saveButton = page.locator("//button[.//text()[normalize-space()='Save']]"); // For nested text

// ✅ GOOD - XPath for partial text match (contains)
this.workQueueHeading = page.locator("//h1[contains(text(), 'Work Queue')]");

// ✅ GOOD - XPath with multiple conditions
this.requiredField = page.locator("//label[text()[normalize-space()='Email']]/..//input[@required]");
```

**Common XPath Patterns:**
| Pattern | Use Case | Example |
|---------|----------|---------|
| `//tag[text()[normalize-space()='Text']]` | Exact text match (ignoring whitespace) | `//span[text()[normalize-space()='Work Order']]` |
| `//tag[contains(text(), 'Partial')]` | Partial text match | `//h1[contains(text(), 'Dashboard')]` |
| `//tag[.//text()[normalize-space()='Text']]` | Text anywhere in descendants | `//button[.//text()[normalize-space()='Submit']]` |
| `//label[...]/following-sibling::input` | Input after label | Form fields |
| `//label[...]/..//input` | Input as descendant of label's parent | Form fields (nested) |
| `//div[@class='container']//button` | Button inside container | Scoped searches |

**Why XPath with `normalize-space()`:**
- Handles extra whitespace in text nodes
- More reliable than exact string matching
- Works with dynamically generated text
- Consistent across different DOM structures

**CRITICAL: Always Document HTML as Comment**
When creating a locator from HTML, ALWAYS include the HTML as a comment above the locator:
```typescript
// HTML: <button class="mds-button mds-button_primary"><i class="fa-solid fa-magnifying-glass"></i><span>Search</span></button>
// XPath: target button with magnifying-glass icon and span containing "Search"
this.searchButton = page.locator('//button[.//i[contains(@class, "fa-magnifying-glass")] and .//span[text()[normalize-space()="Search"]]]');
```

This helps:
- Future developers understand WHY the XPath is structured this way
- AI models to verify/fix locators without asking for HTML again
- Debugging when element structure changes

**Fallback Strategy (only if XPath doesn't work):**
1. **XPath** - Default, use first
2. **`getByRole`** - For accessibility elements
3. **`getByTestId`** - If data-testid exists
4. **`locator('#id')`** - For unique IDs
5. **`locator('.class')`** - Last resort

#### 7. Always Request HTML When Locator Fails

When a locator doesn't work, ask the user:
> "Please copy the HTML of the element from browser DevTools (Right-click → Inspect → Copy outerHTML)"

This reveals:
- Actual text content
- CSS classes and IDs
- ARIA attributes
- Parent/child structure

---

## 🕐 Fluent Waits (Dynamic Waiting Strategy)

**NEVER use hardcoded waits like `waitForTimeout(5000)`**

Fluent waits poll for element state and are more reliable for varying network conditions.

### Fluent Wait Implementation

```typescript
// BasePage.ts - Add this method
async fluentWaitForElement(locator: Locator, timeout: number = 30000, interval: number = 500): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      if (await locator.isVisible()) {
        return;
      }
    } catch (error) {
      // Element might not be in DOM yet, ignore and retry
    }
    await this.page.waitForTimeout(interval); // Short poll interval
  }
  throw new Error(`Element not visible after ${timeout}ms`);
}
```

### When to Use Fluent Waits

| Scenario | Use Fluent Wait | Example |
|----------|-----------------|---------|
| Dropdown options | ✅ Yes | Wait for options to appear after click |
| Page transitions | ✅ Yes | Wait for new page elements |
| Modal dialogs | ✅ Yes | Wait for modal content |
| Form submissions | ✅ Yes | Wait for success message |
| Simple clicks | ❌ No | Use Playwright's auto-wait |

### Fluent Wait Usage in Page Objects

```typescript
// ✅ GOOD - Fluent wait for dynamic content
async selectDeliveryMethod(method: string): Promise<void> {
  await this.fluentWaitForElement(this.deliveryMethodDropdown, 15000);
  await this.deliveryMethodDropdown.click();
  
  const option = this.page.getByRole('option', { name: method, exact: true });
  await this.fluentWaitForElement(option, 10000);
  await option.click();
}

// ❌ BAD - Hardcoded wait
async selectDeliveryMethod(method: string): Promise<void> {
  await this.page.waitForTimeout(5000); // Bad!
  await this.deliveryMethodDropdown.click();
  await this.page.waitForTimeout(2000); // Bad!
  await option.click();
}
```

---

## ⚙️ Test Configuration Best Practices

### Playwright Config Settings

```typescript
// playwright.config.ts
export default defineConfig({
  // ❌ NO RETRIES - Each test runs once
  retries: 0,
  
  // Video for all tests (debugging)
  use: {
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  
  // Timeouts
  timeout: 60000,        // Test timeout
  expect: {
    timeout: 10000,      // Assertion timeout
  },
});
```

### Why No Retries?

- Retries hide flaky tests instead of fixing them
- Each run should be deterministic
- If test fails, fix the root cause instead of retrying

### Test Execution Command

```bash
# BDD-ONLY FRAMEWORK - Use these commands:

# Run all BDD scenarios
npm run bdd

# Run scenarios by tag
npm run bdd:tags "@WorkOrderCreation"

# Generate report
npx playwright show-report
```

---

## Notes for AI Assistant

### 🔴 CRITICAL RULES (MUST FOLLOW)

**Rule 1: CODEGEN IS PRIMARY SOURCE OF TRUTH**
- When user provides codegen output, USE IT for locators
- Extract element roles (button, menuitem, textbox) from codegen
- Never guess or assume element structure
- If codegen not provided, ASK for it or HTML

**Rule 2: NEVER ASSUME SAME STRUCTURE FOR DIFFERENT ELEMENTS**
- Each element is unique - verify independently
- "Work Order" (button with span) ≠ "Work Queue Dashboard" (menuitem)

**Rule 3: BDD-ONLY FRAMEWORK ARCHITECTURE (CRITICAL!)**

This framework follows **BDD-only approach** - NO separate Playwright `.spec.ts` tests.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRAMEWORK ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Feature Files (.feature)                                  │
│   └── Gherkin scenarios (Given/When/Then)                  │
│              │                                              │
│              ▼                                              │
│   Step Definitions (.steps.ts)                              │
│   └── Map Gherkin steps to code                            │
│   └── Call Page Object methods                             │
│              │                                              │
│              ▼                                              │
│   Page Objects (pages/*.ts)                                 │
│   └── All locators defined here                            │
│   └── All actions/interactions here                        │
│   └── All waits handled here                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Rules:**
- ❌ DO NOT create Playwright `.spec.ts` tests - use BDD only
- ❌ DO NOT write raw locators in step definitions
- ✅ Step definitions should ONLY call Page Object methods
- ✅ All locators and waits go in Page Objects
- ✅ Run tests using: `npm run bdd` or `npm run bdd:tags @TagName`

**Step Definition Pattern:**
```typescript
// CORRECT - Step definition calls Page Object
import { WorkOrderCreationPage } from '../../pages/WorkOrderCreationPage';

When('I click the Select button', async function(this: CustomWorld) {
  const workOrderPage = new WorkOrderCreationPage(this.page!);
  await workOrderPage.selectSubmitter();  // Page Object handles locator + wait
});
```

**Why this architecture:**
- **Separation of Concerns**: Feature files = WHAT, Step defs = GLUE, Page Objects = HOW
- **Reusability**: Page Object methods can be reused across multiple step definitions
- **Maintainability**: Change locator once in Page Object, all scenarios benefit
- **Reliability**: Page Objects have built-in fluent waits for slow connections
- **Readability**: Business users read feature files, devs maintain Page Objects
- Check codegen for each element before creating locator

**Rule 3: ASK BEFORE GUESSING**
- If locator is unclear → Ask for HTML
- If element role is ambiguous → Ask for clarification
- If test fails → Ask for report screenshot before fixing
- NEVER make assumptions that cause multiple debug iterations

**Rule 4: XPath IS DEFAULT (Unless User Says Otherwise)**
- Use XPath with `normalize-space()` pattern
- Convert codegen roles to appropriate XPath
- Add parent context when multiple elements match

**Rule 5: ANALYZE BEFORE FIXING**
- When test fails: Analyze error → Explain to user → Ask permission → Fix
- Never apply fixes without understanding root cause
- Check if codegen was used correctly first

### 📋 Standard Operating Procedures

1. **Always check memory file first** before performing any step
2. **Ask for clarification** if any user input is unclear
3. **Provide progress updates** after each major step
4. **Save state frequently** to memory file
5. **Be patient** with user responses - wait for confirmation before proceeding
6. **Handle interruptions gracefully** - allow user to pause and resume
7. **Cross-platform compatibility** - ensure commands work on Windows, Linux, and MacOS
8. **Use relative paths** where possible for portability
9. **Document all assumptions** in memory file
10. **Provide rollback options** if user wants to undo a step

### 🎯 Locator Creation Checklist

Before creating any locator:
- [ ] Did user provide codegen output? → Use it
- [ ] What role does codegen show? (button, menuitem, link, textbox)
- [ ] Is the role clear enough for XPath? → If not, ask for HTML
- [ ] Could multiple elements match? → Add parent context
- [ ] Is this a dropdown/dynamic element? → Add fluent waits

### ⚠️ Page Object Model Rules

11. **CRITICAL - Page Object Model Reuse:** Always check existing Page Object Model methods before generating new ones. Reuse existing methods whenever possible. Only create new methods if no existing method can perform the required action.

### 📊 Reporting Rules

12. **CRITICAL - Allure Reports with Videos:** Always generate Allure reports after test/suite execution. Ensure videos are captured and attached to Allure reports for both passed and failed tests. Never skip video capture for passed tests.

### 🥒 Cucumber/BDD Rules

13. **CRITICAL - Cucumber Step Definitions vs Playwright Tests:** 
    - Feature files (.feature) require ACTUAL Cucumber step definitions to enable Ctrl+Click navigation
    - Playwright test specs (.spec.ts) are DIFFERENT from Cucumber step definitions
    - Step definitions MUST be created in `features/step-definitions/` folder using `@cucumber/cucumber` imports
    - ALWAYS create: `world.ts`, `hooks.ts`, and `*.steps.ts` files for proper BDD integration
    - ALWAYS create `.vscode/settings.json` with `cucumberautocomplete.steps` configuration
    - ALWAYS create `cucumber.js` configuration file
    - Without these files, Ctrl+Click on feature file steps will NOT work

### 🔄 Test Failure Response Protocol

When a test fails:
```
1. User shares error/screenshot
2. AI analyzes:
   - Which step failed?
   - What was the locator?
   - What error type? (timeout, strict mode, not found)
3. AI explains root cause to user
4. AI asks: "Would you like me to fix this?"
5. User confirms
6. AI implements fix
7. AI runs test again
```

**NEVER skip step 3-5. Always explain before fixing.**

### 🚫 What NOT to Do

| Don't | Do Instead |
|-------|------------|
| Assume element structure | Check codegen or ask for HTML |
| Apply same fix to all elements | Verify each element individually |
| Use hardcoded waits | Use fluent waits |
| Enable test retries | Fix flaky tests properly |
| Fix without explaining | Explain root cause first |
| Guess locators | Use codegen or ask for HTML |

---

## User Communication Template

Use these templates for consistent communication:

- **Installation:** "Checking for [Component] installation..."
- **Waiting for Input:** "Please provide [Information] to proceed."
- **Confirmation:** "I've completed [Action]. Would you like to proceed to the next step?"
- **Error:** "An error occurred: [Error]. Let me try [Alternative Approach]."
- **Success:** "Successfully completed [Action]. Moving to next step."

---

## Cross-Platform Command Reference

### Windows (PowerShell)
- Check VS Code: `code --version`
- Check Node: `node --version`
- Install extension: `code --install-extension ms-playwright.playwright`
- Run Playwright: `npx playwright codegen <URL>`

### Linux/MacOS
- Check VS Code: `code --version`
- Check Node: `node --version`
- Install extension: `code --install-extension ms-playwright.playwright`
- Run Playwright: `npx playwright codegen <URL>`

### Path Detection
- Windows: Use `$env:ProgramFiles` or `$env:LOCALAPPDATA`
- Linux: Check `/usr/bin/code` or `~/.local/bin/code`
- MacOS: Check `/Applications/Visual Studio Code.app` or `~/.vscode`

---

## End of Prompt

This prompt should be followed step-by-step, maintaining the memory file throughout the process. If any step is unclear, ask the user for clarification before proceeding.

