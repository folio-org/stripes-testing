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

const delay = async (ms) => new Promise((res) => setTimeout(res, ms));

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
    OKAPI_HOST: 'https://api-bugfest-sunflower-aqa.int.aws.folio.org',
    OKAPI_TENANT: 'fs09000003',
    diku_login: 'folio-aqa',
    diku_password: 'folio-aqa',
    z3950_login: 'z3950Admin',
    z3950_password: 'password',
    // it is necessary to set the ECS environment name when running ECS tests to get correct tenants names on the target env: 'sprint' or 'snapshot'
    ecs_env_name: 'sunflower',
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

      // eslint-disable-next-line global-require
      await require('cypress-testrail-simple/src/plugin')(on, config);

      return result;
    },
    baseUrl: 'https://bugfest-sunflower-aqa.int.aws.folio.org',
    testIsolation: false,
  },
});
