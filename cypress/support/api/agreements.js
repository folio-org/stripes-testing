Cypress.Commands.add('getAgreementsByStatus', (status) => {
  cy.okapiRequest({
    method: 'GET',
    path: `erm/sas?filters=agreementStatus.value==${status}&sort=name&offset=1&limit=1`,
    isDefaultSearchParamsRequired: false,
  });
});
