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

- `RP_API_URL`: The Report Portal API endpoint (e.g., `https://report-portal.ci.folio.org/api/v1`)
- `RP_CYPRESS_PROJECT_NAME`: The project name in Report Portal (e.g., `cypress-nightly`)
- `CI_API_KEY`: The API token for authenticating with Report Portal

Example `.env` entries:

```
RP_API_URL=https://report-portal.ci.folio.org/api/v1
CI_API_KEY=your-actual-token-here
RP_CYPRESS_PROJECT_NAME=cypress-nightly
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
3. **`cypress.config.js`**: Conditionally registers the `after:spec` event handler
