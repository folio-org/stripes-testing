import { REQUEST_METHOD } from '../constants';

Cypress.Commands.add('getInstance', (searchParams) => {
  cy.okapiRequest({
    path: 'search/instances',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.instances[0];
  });
});

Cypress.Commands.add('getAlternativeTitlesTypes', (searchParams) => cy
  .okapiRequest({
    path: 'alternative-title-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  })
  .then(({ body }) => body.alternativeTitleTypes));

Cypress.Commands.add('createAlternativeTitleTypes', (alternativeTitleType) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'alternative-title-types',
    body: alternativeTitleType,
  }).then(({ body }) => body.id);
});

Cypress.Commands.add('deleteAlternativeTitleTypes', (alternativeTitleTypeID) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `alternative-title-types/${alternativeTitleTypeID}`,
  });
});

Cypress.Commands.add('createClassifierIdentifierTypes', (classificationType) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'classification-types',
    body: classificationType,
  }).then(({ body }) => body.id);
});

Cypress.Commands.add('deleteClassifierIdentifierTypes', (classificationType) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `classification-types/${classificationType}`,
  });
});
