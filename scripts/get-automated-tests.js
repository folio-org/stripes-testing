/* eslint-disable no-console */
const { team, getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = 3075;

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

function printAutomatedTestsByTeams() {
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      // custom_automation_type: 1 - Automated, 2 - Manual
      const automatedTests = tests.filter((test) => test.custom_automation_type === 1);
      console.log(`Number of automated tests in the #${runId} run: ${automatedTests.length}\n`);
      // eslint-disable-next-line guard-for-in
      for (const key in team) {
        const count = automatedTests
          .filter((test) => test.custom_dev_team === team[key]).length;
        console.log(`${key}: ${count}`);
      }
    });
}

printAutomatedTestsByTeams();
