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
import './organizations';
import './users';
import 'cypress-file-upload';
import './data-import';

setInteractorTimeout(20_000);


require('cypress-xpath');
require('cypress-grep')();

// try to fix the issue with cached location in cypress
Cypress.on('window:before:load', window => {
  Object.defineProperty(window.navigator, 'language', { value: 'en' });
});
