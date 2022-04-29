import { v4 as uuidv4 } from 'uuid';

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

Cypress.Commands.add('addServicePointToUser', (servicePointIds, userId, defaultServicePointId) => {
  const defaultSp = defaultServicePointId ?? servicePointIds[0];
  cy.okapiRequest({
    method: 'POST',
    path: 'service-points-users',
    body: {
      id: uuidv4(),
      userId,
      servicePointsIds: servicePointIds,
      defaultServicePointId: defaultSp
    }
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
