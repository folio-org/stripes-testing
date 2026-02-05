# Report Portal Failed Tests Runner

## Overview

The `runFailedTests.js` script fetches failed tests from the latest Report Portal launch (`runNightlyCypressEurekaTests` or `folioQualityGates`), reruns them using the Cypress Module API, and marks any tests that pass on rerun as flaky in Report Portal **immediately after each spec file completes** (not after all tests finish).

## Arguments

Parse arguments from the user's request:

- `--launchName`: Name of the Report Portal launch (default: `runNightlyCypressEurekaTests`)
- `--team`: Team name (e.g., Volaris, Firebird). Optional - if not specified, all teams are considered
- `--headed`: Run Cypress in headed mode (boolean flag, default: false)

## Execution

Run the command from the `stripes-testing` folder:

```bash
node scripts/report-portal/runFailedTests.js [arguments]
```

Examples:
- Default (nightly tests): `node scripts/report-portal/runFailedTests.js`
- With team: `node scripts/report-portal/runFailedTests.js --launchName runNightlyCypressEurekaTests --team Volaris`
- Headed mode: `node scripts/report-portal/runFailedTests.js --launchName folioQualityGates --team Firebird --headed`

## Required Environment Variables

The following environment variables must be set in the `.env` file:

- `CI_API_KEY`: The API token for authenticating with Report Portal

Example `.env` entries:

```
CI_API_KEY=report-portal-token-here
```

## Flow Summary

1. **Fetch failed tests**: Query Report Portal for tests with **"To Investigate"** status from the latest launch.
2. **Extract test information**: Get test details (id, testPath, ...) and create a **unique list of file paths** to rerun.
3. **Write to temp file**: Save `itemsToInvestigate` to a temporary JSON file to avoid command-line length limits with large datasets.
4. **Pass file path to Cypress**: Pass the temp file path (not the data itself) through Cypress `env` configuration.
5. **Enable after:spec handler**: The `cypress.config.js` detects `config.env.itemsFilePath` and registers an `after:spec` event handler.
6. **Run tests**: Execute all tests in the identified spec files using Cypress Module API. This may rerun more tests than originally failed, as files may contain multiple tests.
7. **Mark tests immediately**: After each spec file completes:
   - The `after:spec` handler reads items from the temp file
   - Extracts passed tests from that spec
   - Matches passed tests against the items list
   - **Immediately marks matching tests as flaky** in Report Portal via API
   - This happens during test execution, not after all tests finish
8. **Clean up**: Delete the temporary file after all tests complete.
9. **Verify results**: Query Report Portal again to confirm how many tests were successfully marked as flaky.

## Key Features

- **Immediate marking**: Tests are marked as flaky right after each spec completes, providing faster feedback
- **File-based data passing**: Uses temp files to pass large datasets, avoiding `ENAMETOOLONG` errors on Windows
- **Handles hundreds of tests**: Can process 200+ failed tests without command-line length issues
- **Reliable**: If the script crashes mid-run, already-completed specs will have been marked
- **No impact on other jobs**: The `after:spec` handler only activates when `itemsFilePath` is set in Cypress env
- **Real-time progress**: Console output shows marking progress as each spec finishes

## Implementation Details

### Components

1. **`runFailedTests.js`**: Main script that orchestrates the test rerun process
2. **`afterSpecHandler.js`**: Handler function that marks tests as flaky after each spec
3. **`setupAfterSpecChaining.js`**: Chains TestRail and flaky marker `after:spec` handlers
4. **`cypress.config.js`**: Conditionally activates the handler chaining via `setupAfterSpecChaining`

### How It Works

To avoid Windows command-line length limits with large datasets (222+ tests), the script uses a file-based approach:

1. **Write to temp file**: The script writes `itemsToInvestigate` to a temporary JSON file
2. **Pass file path**: Only the file path is passed through Cypress `env` (not the entire array)
3. **Read in handler**: The `after:spec` handler reads the items from the file

```javascript
// In runFailedTests.js
const tempFile = path.join(os.tmpdir(), `cypress-items-${Date.now()}.json`);
fs.writeFileSync(tempFile, JSON.stringify(itemsToInvestigate, null, 2));

cypressOptions.env = {
  itemsFilePath: tempFile,
};
```

In `cypress.config.js`, the `setupNodeEvents` function checks for the file path and sets up handler chaining:

```javascript
const setupAfterSpecChaining = require('./scripts/report-portal/setupAfterSpecChaining');

// In setupNodeEvents
await setupAfterSpecChaining(on, config);
```

**Handler Chaining**: Since Cypress's `on()` function **overwrites** previous handlers (except for `task` event) rather than chaining them, the `setupAfterSpecChaining` module uses an interceptor pattern to capture the TestRail plugin's `after:spec` handler and then registers a combined handler that calls both the TestRail handler and the flaky marker handler sequentially. This ensures both handlers execute without either being lost.

The chaining logic in `setupAfterSpecChaining.js`:
- When `config.env.itemsFilePath` is set, it intercepts the TestRail plugin's handler registration
- Captures the TestRail `after:spec` handler
- Registers a combined handler that executes both TestRail and flaky marker handlers
- When `itemsFilePath` is not set, the TestRail plugin runs normally without modification

This approach ensures:
- The handler only runs when explicitly enabled by the script
- Regular test runs are unaffected (TestRail plugin runs normally)
- Both TestRail and flaky marker handlers execute when `itemsFilePath` is set
- Large datasets don't cause `ENAMETOOLONG` errors
- Works reliably across all operating systems

## Example Output

```
Launch: runNightlyCypressEurekaTests
Team: Volaris
Headed: false

Fetching failed tests from Report Portal...
✓ Found 222 failed test(s) to investigate

Test files to rerun: 202 spec file(s)

Running tests...

📋 Marking 2 test(s) from cypress/e2e/circulation-log/action-buttons.cy.js as flaky...
✓ Successfully marked 2 test(s) as flaky

📋 Marking 1 test(s) from cypress/e2e/notes/item-notes.cy.js as flaky...
✓ Successfully marked 1 test(s) as flaky

📋 Marking 3 test(s) from cypress/e2e/orders/reopen-order.cy.js as flaky...
✓ Successfully marked 3 test(s) as flaky

(Tests continue...)

✓ Successfully marked 6 test(s) as flaky out of 222 failed test(s)
```

The final count is calculated by querying Report Portal again after tests complete and comparing the number of "To Investigate" items before and after the test run.