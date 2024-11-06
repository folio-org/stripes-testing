/* eslint-disable no-console */
const { glob } = require('glob');
const fs = require('fs');
const { getTestNames } = require('find-test-names');
const { status, team, getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
const { removeRootPath, titleContainsId } = require('./helpers/tests.helper');
require('dotenv').config();

const selectedStatus = [status.Failed, status.Retest];
const selectedTeams = [
  team.Firebird,
  team.Folijet,
  team.Spitfire,
  team.Thunderjet,
  team.Vega,
  team.Volaris,
  team.Corsair,
];

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;
const runId = process.env.TESTRAIL_RUN_ID;

const testrailClient = createTestRailClient(testUsername, testPassword);
const getTests = getTestRunResults.bind(null, testrailClient, runId);

const ids = [];
const arrayOfFiles = [];
let filteredFiles = [];

function parseCommand() {
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        if (
          selectedStatus.includes(test.status_id) &&
          selectedTeams.includes(test.custom_dev_team)
        ) {
          ids.push('C' + test.case_id);
        }
      });
    })
    .then(() => {
      glob('cypress/e2e/**/*')
        .then((res) => {
          res.forEach((file) => {
            if (file.includes('.cy.js')) {
              arrayOfFiles.push(removeRootPath(file).replace(/\\/g, '/'));
            }
          });
        })
        .then(() => {
          arrayOfFiles.forEach((file) => {
            const text = fs.readFileSync(file, { encoding: 'utf8' });
            const names = getTestNames(text);
            names.tests.forEach((test) => {
              if (test.type === 'test' && titleContainsId(test.name, ids)) {
                filteredFiles.push(file);
              }
            });
          });
          console.log(`Number of filtered tests with duplicates: ${filteredFiles.length}\n`);
          // remove duplicates
          filteredFiles = Array.from(new Set(filteredFiles));
          filteredFiles.sort();
          console.log(`Number of filtered tests without duplicates: ${filteredFiles.length}\n`);
        })
        .then(() => {
          const parsedCommand = `--spec "${filteredFiles.join(',')}"`;
          console.log(parsedCommand);
          return parsedCommand;
        });
    });
}

parseCommand();
