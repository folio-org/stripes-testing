/* eslint-disable no-console */
const { glob } = require('glob');
const fs = require('fs');
const { getTestNames } = require('find-test-names');
const { status, team, getTestRunResults } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
const { removeRootPath, titleContainsId } = require('./helpers/tests.helper');
require('dotenv').config();

const selectedStatus = [status.Failed, status.Retest, status.Untested];
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
const arrayOfFiles = [];
let filteredFiles = [];
const shuffle = true;
const numberOfChunks = 1;
const chunks = [];

function parseCommand() {
  getTests()
    .then((tests) => {
      console.log(`\nNumber of all tests in the #${runId} run: ${tests.length}\n`);
      tests.forEach((test) => {
        if (
          selectedStatus.includes(test.status_id) &&
          selectedTeams.includes(test.custom_dev_team)
          // && test.custom_test_group === 1     // ---> to select smoke tests (1), critical (2), extended (3)
        ) {
          ids.push('C' + test.case_id + ' ');
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
          console.log(`Number of filtered tests without duplicates: ${filteredFiles.length}\n`);
          filteredFiles.sort();
          if (shuffle) {
            filteredFiles.sort(() => Math.random() - 0.5);
          }
          if (numberOfChunks > 1) {
            const chunkSize = Math.ceil(filteredFiles.length / numberOfChunks);
            // Loop to split array into chunks
            for (let i = 0; i < filteredFiles.length; i += chunkSize) {
              const chunk = [];
              for (let j = i; j < i + chunkSize && j < filteredFiles.length; j++) {
                chunk.push(filteredFiles[j]);
              }
              chunks.push(chunk);
            }
          }
        })
        .then(() => {
          const parsedCommand = `--spec "${filteredFiles.join(',')}"`;
          if (numberOfChunks === 1) {
            console.log(parsedCommand);
            // To print test cases IDs (NOT FILTERED!!!)
            console.log(`--env grepTags="${ids.join('')}"`);
          } else {
            console.log(`Number of chunks: ${chunks.length}\n`);
            chunks.forEach((chunk, index) => {
              console.log(`Chunk #${index + 1}: `, chunk.length);
              console.log(`--spec "${chunk.join(',')}"\n`);
            });
          }
          return parsedCommand;
        });
    });
}

parseCommand();
