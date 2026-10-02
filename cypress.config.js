const { defineConfig } = require('cypress');
const path = require('path');
const globby = require('globby');
const converter = require('json-2-csv');
const { downloadFile } = require('cypress-downloadfile/lib/addPlugin');
const { rm, unlink } = require('fs');
const fs = require('fs');
const allureWriter = require('@shelex/cypress-allure-plugin/writer');
const { cloudPlugin } = require('cypress-cloud/plugin');
const registerReportPortalPlugin = require('@reportportal/agent-js-cypress/lib/plugin');
const webpackPreprocessor = require('@cypress/webpack-batteries-included-preprocessor');
const testRailPlugin = require('cypress-testrail-simple/src/plugin');
const httpTasks = require('./cypress/tasks/httpTasks');
const flakyMarkerHandler = require('./scripts/report-portal/afterSpecHandler');

let activeEnvironment = null; // DO NOT SET ENV HERE, do it in ./environments.js file
let environments = {};
try {
  // eslint-disable-next-line global-require
  ({ activeEnvironment, environments } = require('./environments'));
} catch (e) {
  // cypress/environments.js is gitignored and proceed with defaults
}

const delay = async (ms) => new Promise((res) => setTimeout(res, ms));

const envOverrides = (activeEnvironment && environments[activeEnvironment]) || {};
if (activeEnvironment && !environments[activeEnvironment]) {
  const available = Object.keys(environments).join(', ');
  throw new Error(
    `Environment "${activeEnvironment}" not found in cypress/environments.js\nAvailable: ${available}`,
  );
}

let cypressLocal = {};
try {
  // eslint-disable-next-line global-require, import/extensions
  cypressLocal = require('./cypress.local.js');
} catch (e) {
  // cypress.local.js is gitignored and optional
}

/**
 * Chains after:spec handlers to ensure both TestRail and flaky marker handlers execute.
 * Since Cypress's on() overwrites previous handlers (except for 'task'), we need to intercept
 * the TestRail plugin's handler registration and combine it with the flaky marker handler.
 */
async function setupAfterSpecChaining(on, config) {
  if (config.env.itemsFilePath) {
    on('before:browser:launch', (browser, launchOptions) => {
      if (browser.family === 'chromium') {
        launchOptions.args.push('--no-sandbox');
        launchOptions.args.push('--disable-gpu');
      }
      return launchOptions;
    });

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

const reportportalOptions = {
  apiKey: process.env.CI_API_KEY ? process.env.CI_API_KEY : '',
  restClientConfig: {
    timeout: 360000,
  },
};

module.exports = defineConfig({
  retries: {
    runMode: 0,
    openMode: 0,
  },
  numTestsKeptInMemory: 1,
  watchForFileChanges: true,
  viewportWidth: 1920,
  viewportHeight: 1080,
  video: false,
  defaultCommandTimeout: 51000,
  pageLoadTimeout: 60000,
  requestTimeout: 60000,
  responseTimeout: 60000,
  downloadsFolder: 'cypress/downloads',
  env: {
    OKAPI_HOST: 'https://folio-etesting-cypress-kong.ci.folio.org',
    OKAPI_TENANT: 'diku',
    diku_login: 'diku_admin',
    diku_password: 'admin',
    z3950_login: 'z3950Admin',
    z3950_password: 'password',
    // it is necessary to set the ECS environment name when running ECS tests to get correct tenants names on the target env: 'sprint' or 'snapshot'
    ecs_env_name: 'snapshot',
    is_kiwi_release: false,
    downloadTimeout: 2000,
    allure: true,
    allureReuseAfterSpec: true,
    grepFilterSpecs: true,
    grepOmitFiltered: true,
    rtrAuth: true,
    ecsEnabled: false,
    eureka: true,
    runAsAdmin: false,
    systemRoleName: 'adminRole',
    newSettings: false,
    ...(envOverrides.env || {}),
  },
  reporterOptions: reportportalOptions,
  e2e: {
    async setupNodeEvents(on, config) {
      on('file:preprocessor', webpackPreprocessor());

      allureWriter(on, config);

      on('task', {
        log(message) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },

        async findFiles(mask) {
          if (!mask) {
            throw new Error('Missing a file mask to search');
          }

          const list = await globby(mask);

          if (!list.length) {
            return null;
          }

          return list;
        },

        convertCsvToJson(data) {
          const options = { excelBOM: true, trimHeaderFields: true, trimFieldValues: true };
          return converter.csv2json(data, options);
        },

        parseExcelCsvFile(filePath) {
          // eslint-disable-next-line global-require
          const XLSX = require('xlsx');
          const fileBuffer = fs.readFileSync(filePath);
          const hasBom = fileBuffer[0] === 0xef && fileBuffer[1] === 0xbb && fileBuffer[2] === 0xbf;
          // Strip BOM before parsing: xlsx v0.18.x prepends the BOM character
          // to the first column header when given a BOM-prefixed buffer
          const parseBuffer = hasBom ? fileBuffer.slice(3) : fileBuffer;
          const workbook = XLSX.read(parseBuffer, { type: 'buffer', codepage: 65001 });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          return { hasBom, rows };
        },

        downloadFile,

        deleteFolder(folderName) {
          return new Promise((resolve, reject) => {
            rm(
              folderName,
              { maxRetries: 10, recursive: true, force: true },
              // eslint-disable-next-line consistent-return
              (err) => {
                if (err && err.code !== 'ENOENT') {
                  return reject(err);
                }
                resolve(null);
              },
            );
          });
        },

        deleteFile(pathToFile) {
          return new Promise((resolve, reject) => {
            // eslint-disable-next-line consistent-return
            unlink(pathToFile, (err) => {
              if (err && err.code !== 'ENOENT') {
                return reject(err);
              }

              resolve(null);
            });
          });
        },

        readFileFromDownloads(filename) {
          const downloadsFolder =
            config.downloadsFolder || path.join(__dirname, '..', '..', 'Downloads');
          const filePath = path.join(downloadsFolder, filename);
          return fs.readFileSync(filePath, 'utf-8');
        },

        // HTTP tasks (axios requests in Node.js context)
        ...httpTasks,
        ...cypressLocal.tasks?.(on, config),
      });

      // keep Cypress running until the ReportPortal reporter is finished. this is a
      // very critical step, as otherwise results might not be completely pushed into
      // ReportPortal, resulting in unfinished launches and failing merges
      on('after:run', async (result) => {
        if (result) {
          if (globby.sync('rplaunchinprogress*.tmp').length > 0) {
            // eslint-disable-next-line no-console
            console.log('Report portal. Await for a 20s...');
            await delay(20000);
          }
        }
      });

      // fix for cypress-testrail-simple plugin
      if ('TESTRAIL_PROJECTID' in process.env && process.env.TESTRAIL_PROJECTID === '') {
        delete process.env.TESTRAIL_PROJECTID;
      }

      registerReportPortalPlugin(on, config);

      // eslint-disable-next-line global-require
      const grepConfig = require('@cypress/grep/src/plugin')(config);

      const result = await cloudPlugin(on, grepConfig);

      // Since Cypress's on() overwrites previous handlers (except for 'task' event),
      // we need to ensure that all handlers that need to run on after:spec
      // are registered in setupAfterSpecChaining to ensure they all execute.
      await setupAfterSpecChaining(on, config);

      return result;
    },
    baseUrl: envOverrides.baseUrl || 'https://folio-etesting-cypress-diku.ci.folio.org',
    testIsolation: false,
  },
  ...cypressLocal.cypress,
});
