//import { CY_ENV, REQUEST_METHOD } from '../constants';

// Cypress.Commands.add('createOwnerApi', (owner) => {
//   cy
//     .okapiRequest({
//       method: 'POST',
//       path: 'owners',
//       body: owner,
//     })
//     .then(({ body }) => {
//       Cypress.env('owner', body);
//     });
// });

// Cypress.Commands.add('getOwnerApi', (searchParams) => {
//   cy.okapiRequest({
//     method: REQUEST_METHOD.GET,
//     path: 'owners',
//     searchParams,
//   })
//     .then(owner => {
//       Cypress.env(CY_ENV.OWNER, owner.body.owners[0]);

//       return owner.body.owners[0];
//     });
// });

// Cypress.Commands.add('deleteOwnerApi', (ownerId) => {
//   cy
//     .okapiRequest({
//       method: 'DELETE',
//       path: `owners/${ownerId}`,
//     });
// });
