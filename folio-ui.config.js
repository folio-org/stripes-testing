//
// global debug options for tests
//
/* eslint-disable eqeqeq */
module.exports = {
  url: process.env.FOLIO_UI_URL || 'http://folio-testing.aws.indexdata.com',
  username: process.env.FOLIO_UI_USERNAME || 'diku_admin',
  password: process.env.FOLIO_UI_PASSWORD || 'admin',
  debug_sleep: parseInt(process.env.FOLIO_UI_DEBUG_SLEEP, 10) || 4000,
  login_wait: parseInt(process.env.FOLIO_UI_LOGIN_WAIT, 10) || 3000,
  test_timeout: parseInt(process.env.FOLIO_UI_TEST_TIMEOUT, 10) || 60000,
  select: {
    username: '#input-username',
    password: '#input-password',
    login: '#clickable-login',
    logout: '#clickable-logout',
    settings: '#clickable-settings',
  },
  nightmare: process.env.FOLIO_UI_DEBUG == 2 ? {
    openDevTools: {
      mode: 'detach',
    },
    width: 800,
    height: 600,
    show: true,
    typeInterval: parseInt(process.env.FOLIO_UI_TYPE_INTERVAL, 10) || 75,
    gotoTimeout: parseInt(process.env.FOLIO_UI_GOTO_TIMEOUT, 10) || 90000,
    waitTimeout: parseInt(process.env.FOLIO_UI_WAIT_TIMEOUT, 10) || 30000,
    executionTimeout: parseInt(process.env.FOLIO_UI_EXECUTION_TIMEOUT, 10) || 30000,
  } : process.env.FOLIO_UI_DEBUG == 1 ? {
    width: 1600,
    height: 1200,
    show: true,
    typeInterval: parseInt(process.env.FOLIO_UI_TYPE_INTERVAL, 10) || 75,
    gotoTimeout: parseInt(process.env.FOLIO_UI_GOTO_TIMEOUT, 10) || 90000,
    waitTimeout: parseInt(process.env.FOLIO_UI_WAIT_TIMEOUT, 10) || 30000,
    executionTimeout: parseInt(process.env.FOLIO_UI_EXECUTION_TIMEOUT, 10) || 30000,
  } : {
    typeInterval: parseInt(process.env.FOLIO_UI_TYPE_INTERVAL, 10) || 75,
    gotoTimeout: parseInt(process.env.FOLIO_UI_GOTO_TIMEOUT, 10) || 90000,
    waitTimeout: parseInt(process.env.FOLIO_UI_WAIT_TIMEOUT, 10) || 30000,
    executionTimeout: parseInt(process.env.FOLIO_UI_EXECUTION_TIMEOUT, 10) || 30000,
  },
};
if (module.exports.url.match(/snapshot/)) {
  module.exports.login_wait = 2000;
}
