import { REQUEST_METHOD } from '../constants';

Cypress.Commands.add('getInstance', (searchParams) => {
  cy.okapiRequest({
    path: 'search/instances',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.instances ? body.instances[0] : undefined;
  });
});

Cypress.Commands.add('getAlternativeTitlesTypes', (searchParams) => {
  cy.okapiRequest({
    path: 'alternative-title-types',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => body.alternativeTitleTypes);
});

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

Cypress.Commands.add('deleteClassifierIdentifierTypes', (classificationTypeId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `classification-types/${classificationTypeId}`,
  });
});

Cypress.Commands.add('createInstanceNoteTypes', (noteType) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'instance-note-types',
    body: noteType,
  }).then(({ body }) => body.id);
});

Cypress.Commands.add('deleteInstanceNoteTypes', (noteTypeId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `instance-note-types/${noteTypeId}`,
  });
});

Cypress.Commands.add('getModesOfIssuance', (searchParams) => {
  cy.okapiRequest({
    path: 'modes-of-issuance',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.issuanceModes[0];
  });
});

Cypress.Commands.add('createModesOfIssuance', (modesOfIssuance) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'modes-of-issuance',
    body: modesOfIssuance,
  }).then(({ body }) => body.id);
});

Cypress.Commands.add('deleteModesOfIssuance', (modesOfIssuanceId) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `modes-of-issuance/${modesOfIssuanceId}`,
  });
});
