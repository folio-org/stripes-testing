/* eslint-disable no-console */
const { status, getTestRunResults, updateTestCasesInTestRun } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;
const testStatusToRemoveFromTestRun = status.NotApplicable;
const printStatusName = Object.keys(status).find(key => status[key] === testStatusToRemoveFromTestRun);

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

const ids = [];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function grepTests() {
  console.log(`All tests in status '${printStatusName}' will be REMOVED from the test run #${runId}, are you sure???`);
  const timeout = 10; // seconds
  for (let i = 1; i <= timeout; i++) {
    console.log(`Reset in ${timeout - i} seconds... To abort press CTRL+C!`);
    await sleep(1000);
  }

  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        if (test.status_id !== testStatusToRemoveFromTestRun) {
          ids.push(test.case_id);
        }
      });
    })
    .then(() => {
      console.log(`Number of tests other than '${printStatusName}': ${ids.length}\n`);

      updateTestCasesInTestRun(testRailClient, runId, ids);
    });
}

grepTests();
