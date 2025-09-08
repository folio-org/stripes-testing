import registerCypressGrep from '@cypress/grep/src/support';
// eslint-disable-next-line import/no-extraneous-dependencies
import { setInteractorTimeout } from '@interactors/globals';

// adding of methods do and expect
import '@interactors/with-cypress';

import './stripes';

import './api';

import './login';
import './checkin';
import './checkout';
import './clipboard';
import './eholdings';
import './inventory';
import './users';
import 'cypress-file-upload';
import 'cypress-recurse/commands';
import './commands';

registerCypressGrep();
setInteractorTimeout(50_000);

require('cypress-xpath');
require('@shelex/cypress-allure-plugin');
require('cypress-plugin-tab');

// try to fix the issue with cached location in cypress
Cypress.on('window:before:load', (window) => {
  Object.defineProperty(window.navigator, 'language', { value: 'en' });
});

Cypress.on('fail', (err) => {
  if (err.message.includes(Cypress.env('diku_password'))) {
    // replace all matches of password in the log with mask
    const passwordRegex = new RegExp(Cypress.env('diku_password'), 'g');
    err.message = err.message.replace(passwordRegex, '[FILTERED]');
  }
  // Mask API key if present in the format apikey=...
  const apiKeyRegex = /apikey=([A-Za-z0-9\-_]+)/g;
  err.message = err.message.replace(apiKeyRegex, 'apikey=[FILTERED]');
  // Rethrow the error in order to retain the test's failed status
  throw err;
});

beforeEach(() => {
  cy.intercept('POST', '/authn/refresh').as('/authn/refresh');
});
