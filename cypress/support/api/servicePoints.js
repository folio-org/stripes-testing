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

<<<<<<< HEAD
Cypress.Commands.add('addServicePointToUser', (servicePointIds, userId, defaultServicePointId) => {
  const defaultSp = defaultServicePointId ?? servicePointIds[0];
=======
Cypress.Commands.add('createServicePoint', (servicePoint) => {
  const testName = `Autotest service point ${getRandomPostfix()}`;

  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'service-points',
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

Cypress.Commands.add('addServicePointToUser', (servicePointId, userId) => {
>>>>>>> 6b623bdd4abcc05057df92d8366283457c49a20f
  cy.okapiRequest({
    method: 'POST',
    path: 'service-points-users',
    body: {
      id: uuidv4(),
      userId,
<<<<<<< HEAD
      servicePointsIds: servicePointIds,
      defaultServicePointId: defaultSp
    }
=======
      servicePointsIds: [servicePointId],
      defaultServicePointId: servicePointId,
    },
>>>>>>> 6b623bdd4abcc05057df92d8366283457c49a20f
  });
});

Cypress.Commands.add('createServicePointApi', (servicePointParameters) => {
  cy.okapiRequest({
    path: 'service-points',
    body: servicePointParameters,
    method: 'POST',
  })
    .then((body) => {
      return body;
    });
});
