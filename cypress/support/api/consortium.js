Cypress.Commands.add('getConsortiaId', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'consortia',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.consortia[0].id;
  });
});

Cypress.Commands.add('assignAffiliationToUser', (affiliationTenantId, targetUserId) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'POST',
      path: `consortia/${consortiaId}/user-tenants`,
      body: {
        tenantId: affiliationTenantId,
        userId: targetUserId,
      },
      isDefaultSearchParamsRequired: false,
    });
  });
});
