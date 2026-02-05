/* eslint-disable no-console */
const cypress = require('cypress');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { getItemsToInvestigate } = require('./services/itemService');
const { LAUNCHES } = require('./constants/constants');

// Windows command line limit is ~8191 chars; use conservative threshold
const WINDOWS_MAX_SPEC_LENGTH = 7000;
const BATCH_SIZE = 50;

/**
 * Checks if batching is needed based on platform and total spec path length
 * @param {string[]} testPaths - Array of test paths
 * @returns {boolean} True if batching is needed
 */
function needsBatching(testPaths) {
  if (os.platform() !== 'win32') {
    return false;
  }
  // Calculate total length of all spec paths joined by commas
  const totalLength = testPaths.join(',').length;
  return totalLength > WINDOWS_MAX_SPEC_LENGTH;
}

/**
 * Runs Cypress tests for the given spec paths
 * @param {string[]} specs - Array of spec paths
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function runCypressSpecs(specs, options) {
  const cypressOptions = {
    browser: 'chrome',
    spec: specs,
    headed: options.headed || false,
  };

  if (options.itemsFilePath) {
    cypressOptions.env = {
      itemsFilePath: options.itemsFilePath,
    };
  }

  try {
    await cypress.run(cypressOptions);
  } catch (error) {
    throw new Error(`Failed to run Cypress: ${error.message}`);
  }
}

/**
 * Runs Cypress tests with the specified test paths using Module API.
 * Automatically batches specs on Windows to avoid ENAMETOOLONG errors.
 * @param {string[]} testPaths - Array of test paths to run
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
async function runCypressTests(testPaths, options = {}) {
  if (!testPaths?.length) {
    console.log('✓ No tests to run');
    return;
  }

  const shouldBatch = needsBatching(testPaths);

  if (!shouldBatch) {
    // Run all specs in a single Cypress run (optimal for CI/CD on Linux)
    console.log(`Running ${testPaths.length} spec(s)...\n`);
    await runCypressSpecs(testPaths, options);
    return;
  }

  // Batch specs to avoid ENAMETOOLONG on Windows
  const batches = [];
  for (let i = 0; i < testPaths.length; i += BATCH_SIZE) {
    batches.push(testPaths.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `Running ${testPaths.length} spec(s) in ${batches.length} batch(es) (Windows mode)...\n`,
  );

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n--- Batch ${i + 1}/${batches.length} (${batch.length} spec(s)) ---\n`);
    await runCypressSpecs(batch, options);
  }
}

/**
 * Parse command line arguments
 * Supports: --launchName value --team value --headed
 */
function parseArgs() {
  const args = {
    launchName: LAUNCHES.NIGHTLY,
    headed: false,
  };

  const booleanFlags = ['headed'];
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);

      if (booleanFlags.includes(key)) {
        args[key] = true;
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        // Next argument should be the value
        args[key] = argv[i + 1];
        i++; // Skip the next argument since we consumed it as a value
      }
    }
  }

  return args;
}

/**
 * Script to rerun failed Cypress tests and mark passed tests as flaky in Report Portal.
 * Details in doc/report-portal-runFailedTests.md
 */
async function main() {
  try {
    const { launchName, team, headed } = parseArgs();

    console.log(`Launch: ${launchName}`);
    console.log(`Team: ${team}`);
    console.log(`Headed: ${headed}`);

    console.log('\nFetching failed tests from Report Portal...');
    const { itemsToInvestigate, uniqTestPaths } = await getItemsToInvestigate({ launchName, team });
    console.log(`✓ Found ${itemsToInvestigate.length} failed test(s) to investigate\n`);

    console.log(`Test files to rerun: ${uniqTestPaths.length} spec file(s)\n`);

    // Write items to temp file to avoid ENAMETOOLONG error
    // (passing large arrays through env creates very long command lines)
    const tempFile = path.join(os.tmpdir(), `cypress-items-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(itemsToInvestigate, null, 2));

    // Run all tests (spec paths are handled internally by Module API, not via command line)
    await runCypressTests(uniqTestPaths, {
      headed,
      itemsFilePath: tempFile,
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (err) {
      // Ignore cleanup errors
    }

    const { itemsToInvestigate: failedItems } = await getItemsToInvestigate({ launchName, team });

    // Display total marked tests
    const totalMarked = itemsToInvestigate.length - failedItems.length;
    if (totalMarked) {
      console.log(
        `\n✓ Successfully marked ${totalMarked} test(s) as flaky out of ${itemsToInvestigate.length} failed test(s)`,
      );
    } else {
      console.log(
        '\n✓ No tests were marked as flaky (all tests failed again or no passed tests matched)',
      );
    }

    process.exit(0);
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
