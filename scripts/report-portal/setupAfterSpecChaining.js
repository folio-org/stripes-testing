const testRailPlugin = require('cypress-testrail-simple/src/plugin');
const flakyMarkerHandler = require('./afterSpecHandler');

/**
 * Sets up chained after:spec handlers to ensure both TestRail and flaky marker handlers execute.
 * Since Cypress's on() overwrites previous handlers (except for 'task'), we need to intercept
 * the TestRail plugin's handler registration and combine it with our flaky marker handler.
 *
 * @param {Function} on - The original on() function from setupNodeEvents
 * @param {Object} config - Cypress config object
 * @returns {Promise<void>}
 */
async function setupAfterSpecChaining(on, config) {
  if (config.env.itemsFilePath) {
    let testRailAfterSpecHandler;

    // Intercept after:spec registration from TestRail plugin
    const interceptedOn = (event, handler) => {
      if (event === 'after:spec') {
        testRailAfterSpecHandler = handler;
      } else {
        on(event, handler);
      }
    };

    // Let TestRail plugin register its handler (captured by interceptor)
    await testRailPlugin(interceptedOn, config);

    // Register combined handler that calls both
    on('after:spec', async (spec, results) => {
      // Call TestRail handler first
      if (testRailAfterSpecHandler) {
        await testRailAfterSpecHandler(spec, results);
      }
      // Then call flaky marker handler
      await flakyMarkerHandler(spec, results, config.env.itemsFilePath);
    });
  } else {
    // Normal flow: just register TestRail plugin
    await testRailPlugin(on, config);
  }
}

module.exports = setupAfterSpecChaining;
