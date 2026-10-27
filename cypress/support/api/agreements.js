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

// Links an eHoldings resource ("title+package") or package directly to an agreement via API.
// Pass `isPackage: true` with the package's own id to link the package itself instead.
Cypress.Commands.add(
  'linkEHoldingsEntityToAgreementApi',
  ({ agreementId, resourceId, agreementName, resourceName, isPackage = false } = {}) => {
    return cy
      .okapiRequest({
        method: 'PUT',
        path: `erm/sas/${agreementId}`,
        body: {
          items: [
            {
              type: 'external',
              authority: isPackage ? 'EKB-PACKAGE' : 'EKB-TITLE',
              reference: resourceId,
              label: agreementName,
              resourceName,
            },
          ],
        },
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => response.body);
  },
);
