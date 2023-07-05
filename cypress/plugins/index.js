/// <reference types="@shelex/cypress-allure-plugin" />

const globby = require('globby');
const { rmdir, unlink } = require('fs');
const cypressGrep = require('cypress-grep/src/plugin');
const { downloadFile } = require('cypress-downloadfile/lib/addPlugin');
const allureWriter = require('@shelex/cypress-allure-plugin/writer');
const fs = require('fs');
const path = require('path');

module.exports = async (on, config) => {
  cypressGrep(config);
  return config;
};
