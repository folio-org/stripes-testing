/* eslint-disable no-console */
const fs = require('fs');
const { getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();


const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);

const TEST_RUN_PATH = './doc/test_runs.json';

const alternativeVersion = false;
const fileJson = {};
fileJson.snapshot = {};
const runDate = new Date().setUTCHours(0, 0, 0, 0);
fileJson.snapshot.test_cases = [];

let testRuns;
function grepTestsFromTestRun() {
  try {
    const testRunsContent = fs.readFileSync(TEST_RUN_PATH, {
      encoding: 'utf8',
    });
    testRuns = JSON.parse(testRunsContent);
    console.log(`Reading the file: ${TEST_RUN_PATH}`);
  } catch (err) {
    console.log(`File does not exist: ${TEST_RUN_PATH}`);
    console.log('Creating new testRuns object...');
    testRuns = {};
    testRuns.snapshot = {};
    testRuns.snapshot.test_cases = [];
  }

  console.log('Getting tests from the test run...');
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        const existingTestCase = testRuns.snapshot.test_cases.find((tc) => tc.case_id === test.case_id);
        if (existingTestCase) {
          if (!existingTestCase.testRuns.some((tr) => tr.date === runDate) || alternativeVersion) {
            existingTestCase.testRuns.push({
              date: runDate,
              run_id: test.run_id,
              status_id: test.status_id,
            });
          }
        } else {
          testRuns.snapshot.test_cases.push({
            case_id: test.case_id,
            title: test.title,
            custom_dev_team: test.custom_dev_team,
            custom_test_group: test.custom_test_group,
            testRuns: [
              {
                date: runDate,
                run_id: test.run_id,
                status_id: test.status_id,
              },
            ],
          });
        }
      });
    })
    .then(() => {
      fs.writeFile(
        TEST_RUN_PATH,
        JSON.stringify(testRuns),
        'utf8',
        (err) => {
          if (err) {
            console.error('Error writing file', err);
          } else {
            console.log('File has been written');
          }
        },
      );
    });
}
grepTestsFromTestRun();
