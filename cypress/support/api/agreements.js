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
