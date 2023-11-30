const { defineConfig } = require('cypress');
const path = require('path');
const globby = require('globby');
const csvToJson = require('convert-csv-to-json');
const { downloadFile } = require('cypress-downloadfile/lib/addPlugin');
const { rmdir, unlink } = require('fs');
const fs = require('fs');
const allureWriter = require('@shelex/cypress-allure-plugin/writer');
const { cloudPlugin } = require('cypress-cloud/plugin');

module.exports = defineConfig({
  retries: {
    runMode: 0,
    openMode: 0,
  },
  numTestsKeptInMemory: 1,
  viewportWidth: 1920,
  viewportHeight: 1080,
  video: false,
  defaultCommandTimeout: 51000,
  pageLoadTimeout: 60000,
  env: {
    OKAPI_HOST: 'https://folio-testing-cypress-okapi.ci.folio.org',
    OKAPI_TENANT: 'diku',
    diku_login: 'diku_admin',
    diku_password: 'admin',
    is_kiwi_release: false,
    downloadTimeout: 2000,
    allure: 'true',
    grepFilterSpecs: true,
    grepOmitFiltered: true,
    rtrAuth: false,
  },
  e2e: {
    async setupNodeEvents(on, config) {
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

        convertCsvToJson(fileName) {
          return csvToJson.supportQuotedField(true).fieldDelimiter(',').getJsonFromCsv(fileName);
        },

        downloadFile,

        deleteFolder(folderName) {
          return new Promise((resolve, reject) => {
            // eslint-disable-next-line consistent-return
            rmdir(folderName, { maxRetries: 10, recursive: true }, (err) => {
              if (err && err.code !== 'ENOENT') {
                return reject(err);
              }

              resolve(null);
            });
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

      // fix for cypress-testrail-simple plugin
      if ('TESTRAIL_PROJECTID' in process.env && process.env.TESTRAIL_PROJECTID === '') {
        delete process.env.TESTRAIL_PROJECTID;
      }

      const configCloud = await cloudPlugin(on, config);

      // eslint-disable-next-line global-require
      const result = require('@cypress/grep/src/plugin')(configCloud);

      // eslint-disable-next-line global-require
      await require('cypress-testrail-simple/src/plugin')(on, config);

      return result;
    },
    baseUrl: 'https://folio-testing-cypress-diku.ci.folio.org',
    testIsolation: false,
  },
});
