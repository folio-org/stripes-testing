/* eslint-disable no-console */
const { glob } = require('glob');
const fs = require('fs');
const { getTestNames } = require('find-test-names');
const axios = require('axios');

const status = {
  Passed: 1,
  Blocked: 2,
  Untested: 3,
  Retest: 4,
  Failed: 5,
};

const team = {
  Firebird: 3,
  Folijet: 4,
  Spitfire: 6,
  Thunderjet: 8,
  Vega: 9,
  Volaris: 13,
  Corsair: 19,
};

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

const testUsername = '';
const testPassword = '';
const runId = 2108;

const ids = [];
const arrayOfFiles = [];
let filteredFiles = [];

function getTest(offsetToPass) {
  return axios({
    method: 'get',
    url: `https://foliotest.testrail.io/index.php?/api/v2/get_tests/${runId}`,
    headers: { 'Content-Type': 'application/json' },
    params: { offset: offsetToPass },
    auth: {
      username: testUsername,
      password: testPassword,
    },
  }).then((response) => {
    console.log(`GET /tests (offset: ${offsetToPass}, length: ${response.data.tests.length})`);
    return response.data.tests;
  });
}

async function getTests() {
  const tests = [];
  let offset = 0;
  let testsFromResponse = 0;
  do {
    testsFromResponse = await getTest(offset);
    tests.push(...testsFromResponse);
    offset += 250;
  } while (testsFromResponse.length === 250);
  return tests;
}

function removeRootPath(path) {
  return path.substring(path.indexOf('cypress\\e2e\\'));
}

function titleContainsId(title, testCaseIds) {
  if (title === undefined) {
    return false;
  }
  for (let i = 0; i < testCaseIds.length; i++) {
    if (title.includes(testCaseIds[i])) {
      return true;
    }
  }
  return false;
}

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
        });
    });
}

parseCommand();
