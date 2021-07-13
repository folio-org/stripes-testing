import { bigtestGlobals } from '@bigtest/globals';
import '@bigtest/cypress';

import './stripes';

import './api';

import './login';
import './checkin';
import './checkout';
import './eholdings';
import './inventory';

bigtestGlobals.defaultInteractorTimeout = 10000;
