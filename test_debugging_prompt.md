# Test Debugging and Auto-Healing Prompt

## Overview
This prompt guides the AI assistant in debugging, fixing, and auto-healing test failures in the Playwright BDD automation framework. It provides structured approaches to identify issues, apply fixes, and prevent common mistakes.

## Prerequisites
- Existing Playwright BDD framework setup
- Test execution logs/errors available
- Access to application under test
- Understanding of Page Object Model structure

---

## STEP 1: Analyze Test Failure

**Objective:** Understand what failed and why before attempting fixes.

**Actions:**
1. **Request Error Details from User:**
   - Ask: "Please provide the test failure output/error message"
   - Ask: "Which step in the feature file failed?"
   - Ask: "Was the test working before? If yes, what changed?"

2. **Categorize the Error Type:**
   | Error Type | Indicators | Common Causes |
   |------------|------------|---------------|
   | Element Not Found | `locator.click: Timeout`, `waiting for selector` | Wrong locator, element not rendered, dynamic content |
   | Timeout | `Timeout 30000ms exceeded` | Slow page load, element never appears, wrong wait condition |
   | Assertion Failed | `expect(locator).toBeVisible()`, `toContainText` | Wrong expected value, element state changed |
   | Navigation Error | `page.goto: net::ERR_`, `Navigation timeout` | URL wrong, page not loading, network issues |
   | Stale Element | `Element is not attached to the DOM` | Page reloaded, dynamic content replaced element |

3. **Check if Error is in:**
   - Step Definition file
   - Page Object file
   - Feature file (syntax)
   - Configuration file

4. **Memory Note:** Record error type and initial analysis.

---

## STEP 2: Inspect the Failing Element

**Objective:** Verify the locator strategy is correct.

**Actions:**
1. **Read the Page Object file** containing the failing locator
2. **Analyze the locator strategy used:**
   ```typescript
   // Priority order for locators (best to worst):
   1. getByRole()      // Most reliable - uses accessibility tree
   2. getByText()      // Good for unique text
   3. getByLabel()     // Good for form fields
   4. getByTestId()    // Good if data-testid exists
   5. locator('css')   // Less reliable - breaks with UI changes
   6. locator('xpath') // Least reliable - very fragile
   ```

3. **Check for common locator issues:**
   | Issue | Example | Fix |
   |-------|---------|-----|
   | Exact match needed | `getByText('Submit')` not finding "Submit Order" | Use `{ exact: true }` or more specific text |
   | Partial match needed | `getByRole('button', { name: 'Submit Order' })` | Button text is " Submit Order" with space |
   | Dynamic text | Element text changes each run | Use partial match or regex |
   | Multiple matches | Locator finds 2+ elements | Add `.first()`, `.nth(0)`, or more specific selector |
   | Hidden element | Element exists but not visible | Check if element is in viewport, wait for visibility |
   | iframe content | Element is inside iframe | Switch to iframe first |

4. **CRITICAL - Verify Locator in Browser:**
   - If possible, ask user to inspect element in browser DevTools
   - Or use Playwright's codegen to capture correct locator:
     ```bash
     npx playwright codegen <URL>
     ```

5. **CRITICAL - Ask User for HTML Content:**
   - **When unsure about locator, ALWAYS ask the user to copy-paste the HTML content of the element**
   - User can right-click element → Inspect → Copy → Copy outerHTML
   - Example request: "Please copy the HTML of the failing element from browser DevTools"
   - This provides exact attributes, classes, text content, and nested elements
   - Example HTML that helps:
     ```html
     <button class="mds-button mds-button_primary">
       <i class="fa-solid fa-check"></i> Select 
     </button>
     ```
   - From this HTML, we can determine:
     - Button has icon inside (`<i>` tag)
     - Text is " Select " (with spaces)
     - Classes: `mds-button`, `mds-button_primary`
     - Best locator: `getByRole('button', { name: /Select/i })`

6. **Memory Note:** Record locator analysis findings.

---

## STEP 3: Apply Locator Fixes

**Objective:** Update locators to correctly identify elements.

**Actions:**
1. **Use Role-Based Locators (Preferred):**
   ```typescript
   // BEST: Role-based (accessibility tree)
   page.getByRole('button', { name: 'Submit' })
   page.getByRole('textbox', { name: 'Email' })
   page.getByRole('heading', { name: 'Welcome' })
   page.getByRole('link', { name: 'Learn more' })
   page.getByRole('checkbox', { name: 'Accept terms' })
   page.getByRole('combobox', { name: 'Country' })
   page.getByRole('menuitem', { name: 'Settings' })
   page.getByRole('dialog').getByRole('button', { name: 'Close' })
   ```

2. **Handle Whitespace in Element Names:**
   ```typescript
   // Problem: Button text has leading/trailing space
   // Button shows: " Submit " but name: 'Submit' fails
   
   // Solutions:
   page.getByRole('button', { name: /Submit/ })           // Regex
   page.getByRole('button', { name: ' Submit' })          // Include space
   page.getByRole('button').filter({ hasText: 'Submit' }) // Filter
   ```

3. **Handle Dynamic Content:**
   ```typescript
   // Problem: Element text includes dynamic values
   // Text: "Order #12345 confirmed"
   
   // Solutions:
   page.getByText(/Order #\d+ confirmed/)     // Regex pattern
   page.getByText('confirmed').first()        // Partial text
   page.locator('text=Order').filter({ hasText: 'confirmed' })
   ```

4. **Handle Multiple Matching Elements:**
   ```typescript
   // Problem: Multiple buttons with same name
   
   // Solutions:
   page.getByRole('button', { name: 'Submit' }).first()
   page.getByRole('button', { name: 'Submit' }).nth(1)
   page.locator('.form-section').getByRole('button', { name: 'Submit' })
   page.getByRole('dialog').getByRole('button', { name: 'Submit' })
   ```

5. **Handle Angular/React Specific Elements:**
   ```typescript
   // ng-select dropdowns
   page.locator('.ng-select-container').click()
   page.locator('#dropdown-id > .ng-select-container > .ng-value-container > .ng-input').click()
   
   // Material UI
   page.locator('[data-testid="submit-button"]')
   page.getByRole('button', { name: 'Submit' }).locator('visible=true')
   ```

6. **Update Page Object with New Locator:**
   - Read the existing Page Object file
   - Replace the failing locator
   - Keep backup of old locator in comment (for reference)

7. **Memory Note:** Record locator changes made.

---

## STEP 4: Add Proper Waits

**Objective:** Ensure elements are ready before interaction.

**Actions:**
1. **Identify Wait Issues:**
   | Symptom | Cause | Solution |
   |---------|-------|----------|
   | "Element not visible" | Element loading | `waitFor({ state: 'visible' })` |
   | "Element not enabled" | Button disabled initially | `waitFor({ state: 'enabled' })` |
   | Clicks nothing | Element covered by loader | Wait for loader to disappear |
   | Stale element | Page reloaded | Re-query element after navigation |
   | Wrong element clicked | Animation in progress | Wait for animation to complete |

2. **Apply Explicit Waits:**
   ```typescript
   // Wait for element to be visible
   await locator.waitFor({ state: 'visible' });
   await locator.click();
   
   // Wait for element to be hidden (loader)
   await page.locator('.loading-spinner').waitFor({ state: 'hidden' });
   
   // Wait for network idle
   await page.waitForLoadState('networkidle');
   
   // Wait for specific response
   await page.waitForResponse(resp => resp.url().includes('/api/submit'));
   
   // Custom wait with timeout
   await locator.waitFor({ state: 'visible', timeout: 60000 });
   ```

3. **Auto-Wait Best Practices:**
   ```typescript
   // Playwright auto-waits for these, but you can increase timeout:
   await page.click('button', { timeout: 30000 });
   await page.fill('input', 'text', { timeout: 30000 });
   
   // For assertions, increase expect timeout:
   await expect(locator).toBeVisible({ timeout: 30000 });
   ```

4. **DO NOT Use Fixed Waits Unless Absolutely Necessary:**
   ```typescript
   // AVOID: Fixed wait (unreliable)
   await page.waitForTimeout(5000);
   
   // PREFER: Condition-based wait
   await page.waitForSelector('.success-message');
   ```

### Practical Rule for Flaky Timing (First Resort When Repeated Failures)

If the user reports the **same failure 2–3 times** and the fix is not obvious, treat it as a likely **timing/performance** issue:

* Add a **buffer wait after the click** or action that triggers the slow backend call (e.g. “Run Report”).
* Use a bigger wait (e.g. **10–20 seconds**) temporarily to confirm it’s a timing issue.
* After confirming, replace the fixed wait with a **better condition** if possible (e.g. wait for a specific API response, UI result, loader hidden, or network idle).

This helps when a QA environment is slow and the UI/API call legitimately takes longer than normal.

5. **Memory Note:** Record wait changes applied.

---

## STEP 5: Fix Step Definition Mapping

**Objective:** Ensure Gherkin steps match step definitions.

**Actions:**
1. **Verify Step Text Matches Exactly:**
   ```typescript
   // Feature file step:
   // When I click on the "Submit" button
   
   // Step definition MUST match:
   When('I click on the {string} button', async function(buttonName) { ... })
   
   // Common issues:
   // - Extra/missing spaces
   // - Different quotes (" vs ')
   // - Parameter type mismatch ({string} vs {int})
   ```

2. **Check Parameter Types:**
   ```typescript
   // {string} - captures text in quotes: "value"
   // {int} - captures integer: 123
   // {float} - captures decimal: 12.34
   // {word} - captures single word without quotes: value
   ```

3. **Handle Special Characters in Steps:**
   ```typescript
   // Feature file: Then I should see the Re-Print Cover Sheet(s) button
   
   // Step definition - escape special regex chars:
   Then('I should see the Re-Print Cover Sheet\\(s\\) button', ...)
   
   // Or use parameterized:
   Then('I should see the {string} button', ...)
   // Feature: Then I should see the "Re-Print Cover Sheet(s)" button
   ```

4. **Memory Note:** Record step definition fixes.

---

## STEP 6: Handle Application-Specific Issues

**Objective:** Fix issues specific to the application behavior.

**Actions:**
1. **Login/Session Issues:**
   ```typescript
   // Problem: Session expired during test
   // Solution: Add session check and re-login
   
   async ensureLoggedIn() {
     const isLoggedIn = await this.page.locator('.user-menu').isVisible();
     if (!isLoggedIn) {
       await this.login(credentials.userId, credentials.password);
     }
   }
   ```

2. **Popup/Modal Handling:**
   ```typescript
   // Wait for modal to appear
   await page.waitForSelector('[role="dialog"]');
   
   // Click button inside modal
   await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
   
   // Wait for modal to close
   await page.locator('[role="dialog"]').waitFor({ state: 'hidden' });
   ```

3. **Dropdown/Select Issues (ng-select):**
   ```typescript
   // For Angular ng-select components:
   
   // Step 1: Click to open dropdown
   await page.locator('.ng-select-container').click();
   // OR specific dropdown:
   await page.locator('#dropdown-id .ng-input').click();
   
   // Step 2: Wait for options to appear
   await page.waitForSelector('.ng-dropdown-panel');
   
   // Step 3: Select option
   await page.getByRole('option', { name: optionText }).click();
   
   // Alternative: Type to search then select
   await page.locator('.ng-input input').fill(searchText);
   await page.getByRole('option', { name: optionText }).click();
   ```

4. **Table Interaction Issues:**
   ```typescript
   // Click specific row
   await page.locator('tbody tr').filter({ hasText: 'Expected Text' }).click();
   
   // Click button in specific row
   await page.locator('tbody tr')
     .filter({ hasText: 'Row Identifier' })
     .getByRole('button', { name: 'Edit' })
     .click();
   
   // Verify cell content
   await expect(page.getByRole('cell', { name: 'Cell Text' })).toBeVisible();
   ```

5. **Date Picker Issues:**
   ```typescript
   // For standard date inputs
   await page.fill('input[type="date"]', '2024-01-15');
   
   // For custom date pickers - click and select
   await page.click('.date-picker-trigger');
   await page.click('.calendar-day:has-text("15")');
   ```

6. **Memory Note:** Record application-specific fixes.

---

## STEP 7: Update Test Data

**Objective:** Ensure test data is valid and current.

**Actions:**
1. **Check Test Data File:** `support/testData.ts`
   - Verify credentials are valid
   - Verify IDs exist in the system
   - Verify expected values match current application state

2. **Handle Dynamic Test Data:**
   ```typescript
   // Generate unique data for each run
   const uniqueName = `Test_${Date.now()}`;
   const uniqueEmail = `test_${Date.now()}@example.com`;
   
   // Store generated data in World context
   this.generatedData = { name: uniqueName, email: uniqueEmail };
   ```

3. **Environment-Specific Data:**
   ```typescript
   // Use environment variables
   const baseUrl = process.env.BASE_URL || 'https://qa-frontend.example.com';
   const userId = process.env.TEST_USER || 'defaultUser';
   ```

4. **Memory Note:** Record test data updates.

---

## STEP 8: Verify and Re-run Test

**Objective:** Confirm the fix works.

**Actions:**
1. **Run the specific failing test:**
   ```bash
   # Playwright spec
   npx playwright test tests/<test-file>.spec.ts --headed
   
   # Cucumber feature
   npx cucumber-js features/<feature-file>.feature --require-module ts-node/register --require features/step-definitions/**/*.ts
   ```

2. **If test passes:**
   - Confirm fix is complete
   - Update memory file with resolution
   - Document the fix for future reference

3. **If test still fails:**
   - Analyze new error message
   - Return to STEP 1 with new information
   - Try alternative fix approach

4. **Memory Note:** Record test result and next steps.

---

## Common Error Patterns and Quick Fixes

### Quick Reference Table

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `locator.click: Timeout 30000ms exceeded` | Element not found | Check locator, add wait |
| `expect(locator).toBeVisible()` | Element hidden/not rendered | Wait for visibility, check selector |
| `strict mode violation` | Multiple elements match | Add `.first()` or more specific selector |
| `Element is not attached to the DOM` | Stale element | Re-query element |
| `locator.fill: Element is not an input` | Wrong element type | Use correct locator for input |
| `Navigation timeout` | Page load slow | Increase timeout, check URL |
| `net::ERR_CONNECTION_REFUSED` | App not running | Verify app URL and server status |
| `Expected "text" but received ""` | Element empty | Wait for content to load |

### Locator Quick Fixes

```typescript
// Element not found → Try these alternatives:
page.getByRole('button', { name: 'Submit' })     // Best
page.getByRole('button', { name: /Submit/i })    // Case insensitive
page.getByRole('button').filter({ hasText: 'Submit' })
page.locator('button:has-text("Submit")')
page.locator('button').filter({ hasText: 'Submit' }).first()

// Input not found → Try these:
page.getByRole('textbox', { name: 'Email' })     // Best
page.getByLabel('Email')                          // By label
page.getByPlaceholder('Enter email')              // By placeholder
page.locator('input[name="email"]')               // By attribute
page.locator('#email')                            // By ID
```

---

## Auto-Healing Strategies

### Strategy 1: Multiple Locator Fallback
```typescript
async clickWithFallback(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.click();
      return;
    } catch {
      continue;
    }
  }
  throw new Error('None of the fallback locators worked');
}

// Usage:
await this.clickWithFallback([
  page.getByRole('button', { name: 'Submit' }),
  page.locator('#submit-btn'),
  page.locator('button[type="submit"]')
]);
```

### Strategy 2: Self-Healing Locator
```typescript
async findElement(primaryLocator: Locator, fallbacks: Locator[]): Promise<Locator> {
  if (await primaryLocator.isVisible()) {
    return primaryLocator;
  }
  
  for (const fallback of fallbacks) {
    if (await fallback.isVisible()) {
      console.log(`Primary locator failed, using fallback`);
      return fallback;
    }
  }
  
  throw new Error('Element not found with any locator');
}
```

### Strategy 3: Retry with Backoff
```typescript
async retryAction(action: () => Promise<void>, maxRetries = 3): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await action();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.page.waitForTimeout(1000 * (i + 1)); // Increasing delay
    }
  }
}
```

---

## Memory File Structure for Debugging

Add to `.automation-memory.json`:
```json
{
  "debugHistory": [
    {
      "date": "2024-01-15",
      "testFile": "work-order-creation.spec.ts",
      "failingStep": "Click on Submit button",
      "errorType": "Timeout",
      "rootCause": "Button text changed from 'Submit' to ' Submit'",
      "fix": "Updated locator to include leading space",
      "preventionNote": "Always use regex or filter for button text"
    }
  ]
}
```

---

## Notes for AI Assistant

1. **Always read the error message carefully** - it usually tells you exactly what's wrong
2. **Never guess locators** - always verify by reading the Page Object or using codegen
3. **Check for recent application changes** - UI updates often break locators
4. **Prefer fixing locators over adding waits** - waits hide the real problem
5. **Test fixes in isolation** - run only the failing test, not the full suite
6. **Document fixes** - update memory file to prevent future issues
7. **Ask clarifying questions** if error is ambiguous
8. **Don't make multiple unrelated changes** - fix one thing at a time
9. **Verify fix doesn't break other tests** - run related tests after fix
10. **Update Page Objects, not step definitions** - keep locators centralized

---

## User Communication Templates

- **Requesting Info:** "Please share the complete error message from the test failure."
- **Analyzing:** "I see the issue - the element '{element}' cannot be found. Let me check the locator."
- **Fixing:** "I've updated the locator in {file}. The issue was {cause}."
- **Verifying:** "Please run the test again using: `{command}`"
- **Resolved:** "The test should now pass. The fix was: {description}"

---

---

## CRITICAL: Post-Test Failure Workflow

**ALWAYS follow this workflow after any test failure:**

### Step 1: Analyze the Failure Automatically
After a test run fails, IMMEDIATELY:
1. Read the error-context.md file from `test-results/` folder
2. Check for screenshots (`test-failed-*.png`)
3. Review the page snapshot to understand the state
4. Identify which step failed and why

### Step 2: Report Findings to User
Present a clear analysis:
```
## Test Failure Analysis

**Failed Step:** [Step name]
**Error Type:** [Timeout/Element Not Found/Assertion Failed]
**Root Cause:** [Brief explanation]

**Page State at Failure:**
- [What was visible]
- [What was missing]

**Recommended Fix:** [Proposed solution]
```

### Step 3: Ask User Before Fixing
**ALWAYS ask:** "Would you like me to fix this issue?"

Do NOT automatically apply fixes without user confirmation.

### Step 4: Request HTML if Needed
If locator is unclear, ask:
"Please copy the HTML of the [element] from browser DevTools (right-click → Inspect → Copy outerHTML)"

---

## BDD-Specific Issues and Solutions

### Issue 1: Browser Window Positioning/Viewport Mismatch

**Symptom:** UI appears "to the left" or elements are cut off in BDD tests, but Playwright tests work fine.

**Cause:** BDD `world.ts` browser configuration doesn't match `playwright.config.ts`.

**Solution:** Update `world.ts` to match Playwright config exactly:

```typescript
async init() {
  this.browser = await chromium.launch({ 
    headless: false,
  });
  
  this.context = await this.browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1920, height: 1080 },  // MUST match playwright.config.ts
    recordVideo: { dir: 'test-results/videos' },
    ignoreHTTPSErrors: true,
  });
  
  this.page = await this.context.newPage();
  
  // Set timeouts at PAGE level (not context)
  this.page.setDefaultTimeout(30000);
  this.page.setDefaultNavigationTimeout(30000);
}
```

**Key Points:**
- `actionTimeout` and `navigationTimeout` are NOT valid in `BrowserContextOptions`
- Set timeouts using `page.setDefaultTimeout()` and `page.setDefaultNavigationTimeout()`
- Use same viewport size as `playwright.config.ts` (e.g., 1920x1080)
- **DO NOT** use `devices['Desktop Chrome']` with `viewport: null` - causes error:
  `"deviceScaleFactor" option is not supported with null "viewport"`

---

### Issue 2: Step Definition Using Raw Locators Instead of Page Objects

**Symptom:** BDD tests fail but Playwright tests pass on same flow.

**Cause:** Step definitions have raw locators without proper waits, while Page Objects have fluent waits.

**Wrong Approach:**
```typescript
// BAD - Raw locator in step definition
When('I click the Select button', async function() {
  await this.page!.locator('tbody tr').first().locator('button').click();
});
```

**Correct Approach:**
```typescript
// GOOD - Use Page Object method
import { WorkOrderCreationPage } from '../../pages/WorkOrderCreationPage';

When('I click the Select button', async function() {
  const page = new WorkOrderCreationPage(this.page!);
  await page.selectSubmitter();  // Page Object handles waits
});
```

**Rule:** Step definitions should ONLY call Page Object methods. Never write raw locators in step definitions.

---

### Issue 3: Strict Mode Violation - Multiple Elements Match

**Error:**
```
strict mode violation: getByRole('heading', { name: 'Filing Information' }) resolved to 3 elements:
    1) <h2>Filing Information</h2>
    2) <h3>No Filing Information</h3>
    3) <h1 class="modal-title">Filing Information</h1>  ← In dialog
```

**Solution 1:** Use dialog-specific step for modal headings:
```gherkin
# Instead of:
Then I should see the "Filing Information" heading

# Use:
Then I should see the "Filing Information" dialog
```

**Solution 2:** Make locator more specific:
```typescript
// Generic heading (matches multiple)
page.getByRole('heading', { name: 'Filing Information' })

// Dialog-specific heading (matches one)
page.getByRole('dialog').getByRole('heading', { name: 'Filing Information' })
```

---

### Issue 4: Multiple `tbody` Elements on Page

**Error:**
```
strict mode violation: locator('tbody') resolved to 2 elements
```

**Solution:** Use codegen-based locator instead of navigating through tbody:
```typescript
// BAD - Navigating through tbody
const tbody = this.page!.locator('tbody');
const button = tbody.locator('tr').first().locator('button');

// GOOD - Direct button locator from codegen
const button = this.page!.getByRole('button', { name: /Select/i }).first();
```

---

### Issue 5: `expect().toBeVisible()` vs `waitFor()`

**Problem:** `waitFor()` on regex locator may timeout even when element exists.

**Solution:** Use `expect().toBeVisible()` which has built-in auto-retry:
```typescript
// Less reliable
const element = page.getByText(/Work Order #\d+/);
await element.waitFor({ state: 'visible', timeout: 60000 });

// More reliable - matches Playwright test approach
await expect(page.getByText(/Work Order #\d+/)).toBeVisible({ timeout: 60000 });
```

---

### Issue 6: Cucumber Timeout vs Playwright Timeout

**Symptom:** Step times out after 60s but Playwright assertion is still waiting.

**Cause:** Cucumber has its own timeout separate from Playwright's.

**Solution:** Set Cucumber timeout higher than any Playwright timeout:
```typescript
// hooks.ts
import { setDefaultTimeout } from '@cucumber/cucumber';
setDefaultTimeout(120000);  // 2 minutes - higher than any step
```

---

## Regex Special Characters in Button Names

**Problem:** Button names like "Re-Print Cover Sheet(s)" contain parentheses which are regex special characters.

**Symptom:** 
```
waiting for getByRole('button', { name: /Re-Print Cover Sheet(s)/i }) to be visible
Timeout 30000ms exceeded
```

**Why it fails:** In regex, `(s)` is a capture group, NOT literal parentheses.

**Fix:** Escape special regex characters before creating the RegExp:
```typescript
// Escape special regex characters: . * + ? ^ $ { } ( ) | [ ] \
const escapedName = buttonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const buttonRegex = new RegExp(escapedName, 'i');
const button = this.page!.getByRole('button', { name: buttonRegex });
```

**Characters to escape:** `. * + ? ^ $ { } ( ) | [ ] \`

---

## Common BDD Configuration Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `actionTimeout` in context options | TypeScript error | Use `page.setDefaultTimeout()` |
| `devices['Desktop Chrome']` + `viewport: null` | `deviceScaleFactor not supported` | Use fixed viewport instead |
| Viewport mismatch with Playwright config | UI rendering issues | Use same viewport or `viewport: null` with `--start-maximized` |
| Raw locators in step defs | Inconsistent failures | Use Page Object methods |
| Generic heading step for modals | Strict mode violation | Use dialog-specific step |
| `waitFor()` for dynamic text | Timeout | Use `expect().toBeVisible()` |
| Low Cucumber timeout | Step timeout before assertion | Set `setDefaultTimeout(120000)` |
| Special chars in button name regex | Button not found | Escape regex chars: `name.replace(/[.*+?^${}()\|[\]\\]/g, '\\$&')` |
| Combined label+value locator | Element not found | Check if label and value are separate elements |

---

## BDD Framework Architecture Reminder

```
┌─────────────────────────────────────────────────────────────┐
│                    BDD-ONLY FRAMEWORK                       │
├─────────────────────────────────────────────────────────────┤
│  Feature Files (.feature)  →  WHAT to test                 │
│         ↓                                                   │
│  Step Definitions (.steps.ts)  →  GLUE (call Page Objects) │
│         ↓                                                   │
│  Page Objects (pages/*.ts)  →  HOW (locators + waits)      │
└─────────────────────────────────────────────────────────────┘
```

**Golden Rules:**
1. Step definitions should ONLY call Page Object methods
2. All locators and waits belong in Page Objects
3. BDD browser config must match Playwright config
4. Use dialog-specific steps for modal content
5. Run with `npm run bdd` or `npm run bdd:tags @Tag`

---

## End of Prompt

Use this prompt when tests fail to systematically diagnose and fix issues while maintaining proper documentation and preventing regression.

