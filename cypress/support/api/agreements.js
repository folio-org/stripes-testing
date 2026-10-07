Cypress.Commands.add('getAgreementsByStatus', (status) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/sas?filters=agreementStatus.value==${status}&sort=name&offset=1&limit=1`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAgreements', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'erm/sas',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAgreementFileRaw', (id) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/files/${id}/raw`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getErmIdentifiers', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'erm/identifiers',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getErmIdentifierById', (id) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/identifiers/${id}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getEntitlements', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'erm/entitlements',
    isDefaultSearchParamsRequired: false,
  });
});
