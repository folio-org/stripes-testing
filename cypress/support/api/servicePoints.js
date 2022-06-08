import { v4 as uuidv4 } from 'uuid';

import { CY_ENV, REQUEST_METHOD } from '../constants';
import getRandomPostfix from '../utils/stringTools';

Cypress.Commands.add('getServicePointsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'service-points',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('servicePoints', body.servicepoints);
      return body.servicepoints;
    });
});

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
  })
    .then(newServicePoint => {
      Cypress.env(CY_ENV.NEW_SERVICE_POINT, newServicePoint.body);
      return newServicePoint.body;
    });
});

Cypress.Commands.add('deleteServicePoint', (id) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `service-points/${id}`,
  });
});

Cypress.Commands.add('addServicePointToUser', (servicePointIds, userId, defaultServicePointId) => {
  // servicePointIds is array of ids
  cy.okapiRequest({
    method: 'POST',
    path: 'service-points-users',
    body: {
      id: uuidv4(),
      userId,
      servicePointsIds: servicePointIds,
      defaultServicePointId: defaultServicePointId || servicePointIds[0],
    },
  });
});
