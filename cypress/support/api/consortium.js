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
    cy.waitForPrimaryAffiliationSetup(consortiaId, targetUserId);
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

Cypress.Commands.add('removeAffiliationFromUser', (tenantId, targetUserId) => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `consortia/${consortiaId}/user-tenants`,
      searchParams: {
        tenantId,
        userId: targetUserId,
      },
      isDefaultSearchParamsRequired: false,
    });
  });
});

Cypress.Commands.add('affiliateUserToTenant', ({ tenantId, userId, permissions }) => {
  cy.resetTenant();
  cy.assignAffiliationToUser(tenantId, userId);
  cy.setTenant(tenantId);
  cy.assignPermissionsToExistingUser(userId, permissions);
  cy.resetTenant();
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

Cypress.Commands.add('waitForPrimaryAffiliationSetup', (consortiaId, targetUserId) => {
  cy.recurse(
    () => {
      return cy.okapiRequest({
        path: `consortia/${consortiaId}/user-tenants`,
        searchParams: {
          userId: targetUserId,
          limit: 50,
        },
        isDefaultSearchParamsRequired: false,
        failOnStatusCode: false,
      });
    },
    (response) => {
      return response.body.userTenants?.some((el) => el.isPrimary === true) ?? false;
    },
    {
      limit: 20,
      timeout: 40000,
      delay: 1000,
    },
  );
});

Cypress.Commands.add('getAllTenants', () => {
  cy.getConsortiaId().then((consortiaId) => {
    cy.okapiRequest({
      method: 'GET',
      path: `consortia/${consortiaId}/tenants`,
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body.tenants;
    });
  });
});

Cypress.Commands.add('getTenantNameInMemberRun', () => {
  return cy
    .setTenant(Cypress.env('centralTenantId'))
    .then(() => cy.getAllTenants())
    .then((userTenants) => {
      const targetTenant = userTenants.filter(
        (element) => element.id === Cypress.env('OKAPI_TENANT'),
      )[0];
      return cy.setTenant(Cypress.env('OKAPI_TENANT')).then(() => targetTenant.name);
    });
});
