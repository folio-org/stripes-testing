/* eslint-disable no-console */
const { status, team, testTypes, getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const { splitTestsOnChunks } = require('./split-tests-on-chunks');

const selectedTestTypes = [testTypes.smoke, testTypes.criticalPath, testTypes.extendedPath];

const selectedStatus = [
  //status.Passed,
  status.Blocked,
  status.Untested,
  status.Retest,
  status.Failed,
  //status.Unassigned,
];
const selectedTeams = [
  team.Firebird,
  team.Folijet,
  team.Spitfire,
  team.Thunderjet,
  team.Vega,
  team.Volaris,
  team.Corsair,
  team.Eureka,
  team.Citation,
];

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

const ids = [];
const numberOfChunks = 1;
const envVars = '';
const printSpecs = true;

function grepTests() {
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        if (
          selectedStatus.includes(test.status_id) &&
          selectedTeams.includes(test.custom_dev_team) &&
          selectedTestTypes.includes(test.custom_test_group)
        ) {
          ids.push('C' + test.case_id);
        }
      });
    })
    .then(() => {
      console.log(`Number of tests after filtering by status and team: ${ids.length}\n`);
      splitTestsOnChunks(numberOfChunks, ids.join(' '), envVars, printSpecs);
    });
}
grepTests();
