// Cypress.Commands.add('getServicePointsApi', (searchParams) => {
//   cy
//     .okapiRequest({
//       path: 'service-points',
//       searchParams,
//     })
//     .then(({ body }) => {
//       Cypress.env('servicePoints', body.servicepoints);
//     });
// });
import { v4 as uuidv4 } from 'uuid';

Cypress.Commands.add('getServicePointsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'service-points',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('servicePoints', body.servicepoints);
    });
});

Cypress.Commands.add('addServicePointToUser', (servicePointId, userId) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'service-points-users',
    body: {
      id: uuidv4(),
      userId,
      servicePointsIds: [servicePointId],
      defaultServicePointId: servicePointId
    }
  });
});
