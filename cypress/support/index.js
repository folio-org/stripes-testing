import { bigtestGlobals } from '@bigtest/globals';
import '@interactors/with-cypress';

import './stripes';

import './api';

import './login';
import './checkin';
import './checkout';
import './eholdings';
import './inventory';
import './organizations';
import './users';

bigtestGlobals.defaultInteractorTimeout = 10000;

require('cypress-xpath');

//try to fix the issue with cached location in cypress
Cypress.on('window:before:load', window => {
  Object.defineProperty(window.navigator, 'language', { value: 'en' });
});
