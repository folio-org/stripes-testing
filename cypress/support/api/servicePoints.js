import { v4 as uuidv4 } from 'uuid';

import { CY_ENV, REQUEST_METHOD } from '../constants';
import getRandomPostfix from '../utils/stringTools';

// TODO: depricated, use createViaApi from cypress\support\fragments\settings\tenant\servicePoints\servicePoints.js
Cypress.Commands.add('createServicePoint', (servicePoint) => {
  const testName = `Autotest service point ${getRandomPostfix()}`;

  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'service-points',
    isDefaultSearchParamsRequired: false,
    body: {
      id: uuidv4(),
      name: testName,
      code: `Autotest code ${getRandomPostfix()}`,
      discoveryDisplayName: testName,
      pickupLocation: true,
      holdShelfExpiryPeriod: {
        duration: 1,
        intervalId: 'Hours',
      },
      ...servicePoint,
    },
  }).then((newServicePoint) => {
    Cypress.env(CY_ENV.NEW_SERVICE_POINT, newServicePoint.body);
    return newServicePoint.body;
  });
});
