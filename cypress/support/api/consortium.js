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
  cy.wait(15000);
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

Cypress.Commands.add('getPublications', (publicationForTenants, publicationUrl) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'POST',
      path: `consortia/${consortiaId}/publications`,
      body: {
        method: 'GET',
        tenants: publicationForTenants,
        url: publicationUrl,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.id;
    });
  });
});

Cypress.Commands.add('getUserAffiliationsCount', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/_self`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.totalRecords;
    });
  });
});

Cypress.Commands.add('getUserTenants', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/_self`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.userTenants;
    });
  });
});
