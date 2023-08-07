const { defineConfig } = require('cypress');
const path = require('path');
const globby = require('globby');
const { rmdir, unlink } = require('fs');
const { downloadFile } = require('cypress-downloadfile/lib/addPlugin');
const fs = require('fs');
const allureWriter = require('@shelex/cypress-allure-plugin/writer');

module.exports = defineConfig({
  retries: {
    runMode: 0,
    openMode: 0,
  },
  viewportWidth: 1920,
  viewportHeight: 1080,
  video: false,
  defaultCommandTimeout: 101000,
  pageLoadTimeout: 120000,
  env: {
    OKAPI_HOST: 'https://folio-testing-cypress-okapi.ci.folio.org',
    OKAPI_TENANT: 'diku',
    diku_login: 'diku_admin',
    diku_password: 'admin',
    is_kiwi_release: false,
    downloadTimeout: 1000,
    allure: 'true',
    grepFilterSpecs: true,
    grepOmitFiltered: true,
  },
  e2e: {
    async setupNodeEvents(on, config) {
      allureWriter(on, config);

      on('task', {
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
          const downloadsFolder = config.downloadsFolder || path.join(__dirname, '..', '..', 'Downloads');
          const filePath = path.join(downloadsFolder, filename);
          return fs.readFileSync(filePath, 'utf-8');
        },
      });

      // eslint-disable-next-line global-require
      await require('cypress-testrail-simple/src/plugin')(on, config);

      return config;
    },
    baseUrl: 'https://folio-testing-cypress-diku.ci.folio.org',
  },
});
