/* eslint-disable no-console */
const fs = require('fs');
const { markTestsAsFlaky } = require('./services/itemService');
const { SPEC_TYPES } = require('./constants/constants');

/**
 * Cypress after:spec handler that marks passed tests as flaky immediately
 * @param {Object} spec - Spec file info from Cypress
 * @param {Object} results - Test results from Cypress
 * @param {string} itemsFilePath - Path to JSON file containing items to investigate
 */
async function afterSpecHandler(spec, results, itemsFilePath) {
  // Read items from file
  let itemsToInvestigate = [];
  if (itemsFilePath && fs.existsSync(itemsFilePath)) {
    try {
      const fileContent = fs.readFileSync(itemsFilePath, 'utf8');
      itemsToInvestigate = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading items file: ${error.message}`);
      return;
    }
  }

  if (!itemsToInvestigate.length) {
    return;
  }

  const passedTests = results.tests.filter((test) => test.state === 'passed');

  if (!passedTests.length) {
    return;
  }

  // Match passed tests with items to investigate
  const testItemIds = itemsToInvestigate
    .filter((item) => item.codeRef.startsWith(results.spec.name))
    .filter((item) => {
      if (item.type === SPEC_TYPES.STEP) {
        return passedTests.some((passedTest) => {
          const fullTestPath = [results.spec.name, ...passedTest.title].join('/');
          return item.codeRef === fullTestPath;
        });
      } else if (item.type === SPEC_TYPES.SUITE) {
        return passedTests.some((passedTest) => {
          const notFullTestPath = [results.spec.name, ...passedTest.title.slice(0, -1)].join('/');
          return item.codeRef === notFullTestPath;
        });
      }
      return false;
    })
    .map((item) => item.id);

  if (testItemIds.length) {
    console.log(`\n📋 Marking ${testItemIds.length} test(s) from ${spec.relative} as flaky...`);
    try {
      await markTestsAsFlaky({ testItemIds });
      console.log(`✓ Successfully marked ${testItemIds.length} test(s) as flaky`);
    } catch (error) {
      console.error('✗ Error marking tests as flaky:', error.message);
    }
  }
}

module.exports = afterSpecHandler;
