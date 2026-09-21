Cypress.Commands.add('getAgreementsByStatus', (status) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/sas?filters=agreementStatus.value==${status}&sort=name&offset=1&limit=1`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAgreements', (page = 1, perPage = 100) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/sas?page=${page}&perPage=${perPage}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getEntitlements', (page = 1, perPage = 100) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/entitlements?page=${page}&perPage=${perPage}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAgreementFileRaw', (id) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/files/${id}/raw`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
});
