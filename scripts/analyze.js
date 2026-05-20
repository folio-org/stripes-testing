/* eslint-disable no-console */
const { parseGrep, shouldTestRun } = require('@cypress/grep/src/utils');
const globby = require('globby');
const fs = require('fs');
const { getTestNames } = require('find-test-names');
const { argv } = require('node:process');

let numberOfThreads = 1;
let grepTags = '';
let envVars = '';
const allureReport = 'allure.json';

let tests = {};
try {
  const file = fs.readFileSync(allureReport, {
    encoding: 'utf8',
  });
  tests = JSON.parse(file);
} catch (err) {
  console.error(`Error reading ${allureReport} file.`, err);
}
const testIds = [];
console.log(tests.children.length);
tests.children.forEach(element => {
  const testId = element.name.match(/^(C\d+)/)?.[1];
  const status = element.status;
  if (testId) {
    testIds.push([testId, status]);
  }
});

console.log(testIds);

fs.writeFileSync('ids.json', JSON.stringify(testIds, null, 2));
