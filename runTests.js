/* eslint-disable no-useless-concat */
/* eslint-disable no-console */

const procArray = new Map();
let tests = [];
const failedTests = [];
const completedTests = [];
let totalNumberOfAllTests = 0;
const startTime = new Date().getTime();

const cypressGrepConfig = {
  env: {
    grepTags: 't1',
    grepFilterSpecs: true,
    grepOmitFiltered: true,
  },
  excludeSpecPattern: '*.hot-update.js',
  specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
};

function removeRootPath(path) {
  return path.substring(path.indexOf('cypress/e2e/'));
}

function parseTests(useChunks = false) {
  // eslint-disable-next-line global-require
  const filteredTests = require('@cypress/grep/src/plugin')(cypressGrepConfig).specPattern;

  if (filteredTests === 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}') {
    const message = 'No tests found for tags: ' + process.env.grepTags;
    throw new Error(message);
  }

  console.log('Config:');
  console.log(cypressGrepConfig);
  console.log('Threads: ' + process.env.threads);
  console.log('Use chunks: ' + useChunks);
  console.log('Number of found tests: ' + filteredTests.length);

  if (!useChunks) {
    tests = filteredTests;
    totalNumberOfAllTests = tests.length;
    return tests;
  }

  let perChunk = filteredTests.length;

  if (process.env.threads) {
    const threads = Number(process.env.threads);
    if (threads > 0) {
      perChunk = Math.trunc(filteredTests.length / threads);
      if (threads > filteredTests.length) {
        perChunk = 1;
      }
    }
    if (
      Math.trunc(filteredTests.length / threads) > 0 &&
      filteredTests.length / threads > Math.trunc(filteredTests.length / threads)
    ) {
      perChunk += 1;
    }
    console.log('Number of tests in one chunk: ' + perChunk);
  }

  const testGroups = filteredTests
    .map((filteredTest) => removeRootPath(filteredTest))
    .reduce((all, one, i) => {
      const ch = Math.floor(i / perChunk);
      all[ch] = [].concat(all[ch] || [], one);
      return all;
    }, []);

  const parsedTests = testGroups.map((testGroup) => {
    return testGroup.join(',');
  });

  console.log('Parsed tests:');
  console.log(parsedTests);

  return parsedTests;
}

function execTest(test) {
  // eslint-disable-next-line global-require
  const exec = require('child_process').exec;

  const cp = exec(
    `npx cypress run --browser chrome --headed --spec "${test}"`,
    (err, stdout, stderr) => {
      if (err) {
        console.log('Error: ' + test);
        console.log(err);
        failedTests.push({
          name: test,
          code: err.code,
        });
        return;
      }

      // the *entire* stdout and stderr (buffered)
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    },
  );
  procArray.set(cp.pid, cp.pid);
  cp.on('exit', () => {
    completedTests.push(test);
    procArray.delete(cp.pid);
  });
}

function wait(testName) {
  if (procArray.size >= Number(process.env.threads)) {
    setTimeout(wait, 10000, testName);
  } else {
    execTest(testName);
  }
}

function runTask() {
  if (process.env.useChunks === 'true') {
    parseTests(true).forEach((testGroup, index) => {
      setTimeout(execTest, index * 2000, testGroup);
    });
  } else {
    tests = parseTests(false);
    const final = tests.length - 1;
    for (let i = 0; i <= final; i++) {
      const testName = tests.shift();
      console.log('Test name: ' + testName);
      wait(testName);
    }
  }
}

function waitForEnd() {
  if (procArray.size > 0 || tests.length > 0) {
    console.log(
      'All tests: ' +
        totalNumberOfAllTests +
        '\t' +
        'Completed tests: ' +
        completedTests.length +
        ' (' +
        Math.trunc((completedTests.length / totalNumberOfAllTests) * 100) +
        ' %)' +
        '\t' +
        'Failed tests: ' +
        failedTests.length +
        ' (' +
        Math.trunc((failedTests.length / totalNumberOfAllTests) * 100) +
        ' %)' +
        '\t' +
        'Total run time: ' +
        Math.trunc((new Date().getTime() - startTime) / 1000) +
        ' sec',
    );
    setTimeout(waitForEnd, 30000);
  } else {
    console.log(new Date().toLocaleString());
    console.log('Done all tests');
    console.log('Failed tests:');
    console.log(failedTests);
  }
}

function deleteAllureReportFolder() {
  if (process.env.deleteAllureReportFolder === 'true') {
    // eslint-disable-next-line global-require
    const path = require('path');
    const allureReportFolderPath = path.resolve(__dirname, '../stripes-testing/allure-results');
    console.log('Allure folder path to delete: ' + allureReportFolderPath);

    // eslint-disable-next-line global-require
    const fs = require('fs');
    fs.rmSync(allureReportFolderPath, { recursive: true, force: true });
  }
}

async function integrateTestRail() {
  if (process.env.integrateTestRail === 'true') {
    process.env.TESTRAIL_HOST = 'https://foliotest.testrail.io';
    process.env.TESTRAIL_USERNAME = 'SpecialEBS-FOLKaratetestsfailure@epam.com';
    process.env.TESTRAIL_PASSWORD = 'Folio-lsp11';
    process.env.TESTRAIL_PROJECTID = 14;
    process.env.TESTRAIL_RUN_ID = 2108;
  }
}

async function startTests() {
  // Set number of threads
  process.env.threads = 2;
  // Set tags 'tag1', 'tag1+tag2', for more patterns please refer to the https://www.npmjs.com/package/@cypress/grep
  process.env.grepTags = 't1';
  // Set to delete allure report folder before run
  process.env.deleteAllureReportFolder = true;
  // Set to integrate results to the TestRail (update config below)
  process.env.integrateTestRail = false;
  // Set to use chunks
  process.env.useChunks = false;

  cypressGrepConfig.env.grepTags = process.env.grepTags;

  // eslint-disable-next-line spaced-comment
  //process.env.CI_BUILD_ID = 'rt03';

  console.log(new Date().toLocaleString());
  integrateTestRail();
  deleteAllureReportFolder();

  runTask();
  setTimeout(waitForEnd, 10000);
}

startTests();
