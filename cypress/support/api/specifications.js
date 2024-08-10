import { REQUEST_METHOD } from '../constants';

Cypress.Commands.add('getSpecificatoinIds', () => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'specification-storage/specifications',
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response.body.specifications;
  });
});

Cypress.Commands.add('syncSpecifications', (specificationId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: `specification-storage/specifications/${specificationId}/sync`,
    isDefaultSearchParamsRequired: false,
  });
});
