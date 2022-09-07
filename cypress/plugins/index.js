/// <reference types="@shelex/cypress-allure-plugin" />

const globby = require('globby');
const { rmdir, unlink } = require('fs');
const cypressGrep = require('cypress-grep/src/plugin');
const { downloadFile } = require('cypress-downloadfile/lib/addPlugin');
const allureWriter = require('@shelex/cypress-allure-plugin/writer');
// import allureWriter from "@shelex/cypress-allure-plugin/writer";

// eslint-disable-next-line no-unused-vars
module.exports = async (on, config) => {
  cypressGrep(config);

  on('task', {
    // a task to find files matching the given mask
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
  });
  allureWriter(on, config);
  await require('cypress-testrail-simple/src/plugin')(on, config);
  return config;
};