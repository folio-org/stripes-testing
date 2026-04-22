/* eslint-disable no-console */
const fs = require('fs');
const { status, team, testTypes } = require('./helpers/test.rail.helper');

const selectedTestTypes = [testTypes.smoke, testTypes.criticalPath, testTypes.extendedPath];

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

const TEST_RUN_PATH = './doc/test_runs.json';

const testRun = 'snapshot';
const threshold = 0.4; // 40%
const calculateForStatus = status.Passed;

function calculateRateForStatus(testCase, statusToCalculate) {
  return testCase.testRuns.filter((tr) => tr.status_id === statusToCalculate).length / testCase.testRuns.length;
}

function calculatePassRateForTestRun() {
  let testRuns;
  let numberOfFilteredCases = 0;

  try {
    const testRunsContent = fs.readFileSync(TEST_RUN_PATH, {
      encoding: 'utf8',
    });
    testRuns = JSON.parse(testRunsContent);
    console.log(`Reading the file: ${TEST_RUN_PATH}`);
  } catch (err) {
    console.log(`File does not exist: ${TEST_RUN_PATH}`);
  }

  console.log(`Calculating pass rate for test run: ${testRun}...`);
  console.log(testRuns[testRun].test_cases.length);
  testRuns[testRun].test_cases.forEach((test) => {
    if (
      selectedTeams.includes(test.custom_dev_team) &&
      selectedTestTypes.includes(test.custom_test_group)
    ) {
      const passRate = calculateRateForStatus(test, calculateForStatus);
      if (passRate <= threshold) {
        console.log(`Case ID: ${test.case_id}, Title: ${test.title}, Pass rate: ${(passRate * 100).toFixed(0)}%`);
        numberOfFilteredCases++;
      }
    }
  });

  console.log(`Calculation with threshold ${threshold * 100}% for status ${calculateForStatus} completed.`);
  console.log(`Number of filtered cases: ${numberOfFilteredCases}`);
}

calculatePassRateForTestRun();
