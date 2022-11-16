const { defineConfig } = require('cypress');

module.exports = defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,
  video: false,
  defaultCommandTimeout: 101000,
  pageLoadTimeout: 120000,
  env: {
    OKAPI_HOST: 'https://okapi-bugfest-nolana-aqa.int.aws.folio.org',
    OKAPI_TENANT: 'fs09000003',
    diku_login: 'folio-aqa',
    diku_password: 'Folio-aqa1',
    is_kiwi_release: false,
    downloadTimeout: 1000,
    allure: 'true',
    grepFilterSpecs: true,
    grepOmitFiltered: true,
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config);
    },
    baseUrl: 'https://bugfest-nolana-aqa.int.aws.folio.org',
  },
});