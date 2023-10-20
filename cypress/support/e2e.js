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
import './eholdings';
import './inventory';
import './users';
import 'cypress-file-upload';
import './data-import';
import './commands';

registerCypressGrep();
setInteractorTimeout(100_000);

require('cypress-xpath');
require('@shelex/cypress-allure-plugin');

// try to fix the issue with cached location in cypress
Cypress.on('window:before:load', (window) => {
  Object.defineProperty(window.navigator, 'language', { value: 'en' });
});
