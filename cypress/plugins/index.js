/// <reference types="@shelex/cypress-allure-plugin" />

const cypressGrep = require('cypress-grep/src/plugin');

module.exports = async (on, config) => {
  cypressGrep(config);
  return config;
};
