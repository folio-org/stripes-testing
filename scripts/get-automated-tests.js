/* eslint-disable guard-for-in */
/* eslint-disable no-console */
const fs = require('fs');
const { team, getAllTestCases, getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = 3075;
const projectId = 14;

delete team.Citation; // Exclude Citation team from the report

const testRailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testRailClient, runId);
const getTestCases = getAllTestCases.bind(null, testRailClient, projectId);

function printAutomatedTestsByTeamsFromTestRun() {
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

function printAutomatedTestsByTeams() {
  getTestCases().then((cases) => {
    console.log(`\nNumber of all tests in the project #${projectId} run: ${cases.length}`);
    // smoke - 1, critical - 2, extended - 3, Backend - 6, Edge Cases - 7
    const actualTestCases = cases.filter((caseItem) => (caseItem.custom_release !== null) &&
      (caseItem.custom_test_group === 1
        || caseItem.custom_test_group === 2
        || caseItem.custom_test_group === 3
        || caseItem.custom_test_group === 6
        || caseItem.custom_test_group === 7));
    console.log(`Number of actual tests cases (smoke, critical, extended, backend, edge cases) in the project #${projectId} run: ${actualTestCases.length}`);
    // custom_automation_type: 1 - Automated, 2 - Manual
    const automatedTests = actualTestCases.filter((caseItem) => caseItem.custom_automation_type === 1);
    const manualTests = actualTestCases.filter((caseItem) => caseItem.custom_automation_type === 2);
    console.log(`Number of automated tests cases in the project #${projectId} run: ${automatedTests.length}`);
    console.log(`Number of manual tests cases in the project #${projectId} run: ${manualTests.length}`);

    const fileJson = {};
    fileJson.date = new Date().toISOString();
    fileJson.teams = [];

    let totalAutomated = 0;
    let totalManual = 0;
    console.log('Team\t        Automated       Manual  Coverage %');
    for (const key in team) {
      const automatedCount = automatedTests.filter((test) => test.custom_dev_team === team[key]).length;
      totalAutomated += automatedCount;
      const manualCount = manualTests.filter((test) => test.custom_dev_team === team[key]).length;
      totalManual += manualCount;
      const coverage = ((automatedCount / (automatedCount + manualCount)) * 100).toFixed(2);
      console.log(`${key.length <= 4 ? key + '  ' : key}: \t${automatedCount}\t\t${manualCount}\t${coverage}%`);
      fileJson.teams.push({ team: key, 'automated': automatedCount, 'manual': manualCount, 'coverage': `${coverage}%` });
    }
    console.log(`Total: \t\t${totalAutomated}\t\t${totalManual}\t${((totalAutomated / (totalAutomated + totalManual)) * 100).toFixed(2)}%`);
    fs.writeFile(`${fileJson.date.replace(/:/g, '_').replace(/\./g, '_').replace(/-/g, '_')}_automated_tests.json`, JSON.stringify(fileJson), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file', err);
      } else {
        console.log('File has been written');
      }
    });
  });
}
printAutomatedTestsByTeams();
