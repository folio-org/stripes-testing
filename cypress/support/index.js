import { bigtestGlobals } from '@bigtest/globals';
// import { bigtestGlobals } from '@interactors/html';
import '@interactors/with-cypress';

import './stripes';

import './api';

import './login';
import './checkin';
import './checkout';
import './eholdings';
import './inventory';
import './users';
import './organizations';

bigtestGlobals.defaultInteractorTimeout = 10000;
