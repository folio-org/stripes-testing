/* eslint-disable no-console */
const { status, getTestRunResults, getPlanDetails, updateTestCasesInPlanEntry, updateTestCasesInTestRunInPlanEntry } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;
const testStatusToRemoveFromTestRun = status.Failed;
const printStatusName = Object.keys(status).find(key => status[key] === testStatusToRemoveFromTestRun);

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

const ids = [];
const testPlan = false; // set to true if you want to update test cases in the plan entry instead of the test run
const planId = 3798; // set the plan ID if testPlan is true

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function removeTests() {
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

      // if a TestRun is a part of TestPlan, then we need to get the plan details
      // and extract the test entry ID to update the test cases in the plan entry
      // instead of the test run
      if (testPlan) {
        getPlanDetails(testRailClient, planId).then((plan) => {
          console.log(`Plan details: ${JSON.stringify(plan)}`);
          // extract test entry ID from the plan details, example: '88cb407d-bc40-4140-ae2f-8851fdaf8fdd'
          const testEntryId = '88cb407d-bc40-4140-ae2f-8851fdaf8fdd';
          updateTestCasesInPlanEntry(testRailClient, planId, testEntryId, ids);
        });
      }
      updateTestCasesInTestRunInPlanEntry(testRailClient, runId, ids);
    });
}

removeTests();
