/* eslint-disable no-console */
// the script resets test run results to Unassigned (Untested status is not allowed for updating existing results)
// for test run id specified in .env file.
const { status, getTestRunResults, updateMultipleTestResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

const statusToSet = status.Unassigned;

const testResultsToUpdate = [];
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function resetTestRunResults() {
  console.log(`Resetting test run #${runId} results to ${statusToSet} status...`);
  const timeout = 10; // seconds
  for (let i = 1; i <= timeout; i++) {
    console.log(`Reset in ${timeout - i} seconds... To abort press CTRL+C!`);
    await sleep(1000);
  }
  console.log('Getting tests from the test run...');
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        testResultsToUpdate.push({
          test_id: test.id,
          status_id: statusToSet,
        });
      });
    })
    .then(() => {
      if (testResultsToUpdate.length > 0) {
        const blockSize = 500;
        for (let i = 0; i < testResultsToUpdate.length; i += blockSize) {
          const block = testResultsToUpdate.slice(i, i + blockSize);
          console.log(`Updating test run results (block ${Math.floor(i / blockSize) + 1})...`);
          updateMultipleTestResults(testRailClient, runId, block)
            .then(() => {
              console.log(`Block ${Math.floor(i / blockSize) + 1} updated successfully.`);
            })
            .catch((error) => {
              console.error('Error resetting test run results:', error);
            });
        }
      }
    });
}

resetTestRunResults();
