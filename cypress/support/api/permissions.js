Cypress.Commands.add('getPermissionsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'perms/permissions',
    searchParams,
  });
});

Cypress.Commands.add('addPermissionsToNewUserApi', (userAndPermissions) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'perms/users',
    body: userAndPermissions,
  });
});

Cypress.Commands.add('getCapabilitiesApi', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'capabilities?limit=200',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilities).as('capabs');
  });
  return cy.get('@capabs');
});

Cypress.Commands.add('getCapabilitySetsApi', () => {
  cy.okapiRequest({
    method: 'GET',
    path: 'capability-sets?limit=200',
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilitySets).as('capabSets');
  });
  return cy.get('@capabSets');
});

Cypress.Commands.add('addCapabilitiesToNewUserApi', (userId, capabilityIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'users/capabilities',
    body: {
      userId,
      capabilityIds: [...capabilityIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('addCapabilitySetsToNewUserApi', (userId, capabilitySetIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'users/capabilities',
    body: {
      userId,
      capabilitySetIds: [...capabilitySetIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('addRolesToNewUserApi', (userId, roleIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'roles/users',
    body: {
      userId,
      roleIds: [...roleIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUserRoleIdByNameApi', (roleName) => {
  cy.okapiRequest({
    method: 'GET',
    path: `roles?limit=1000&query=name=="${roleName}"`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.roles[0].id).as('roleId');
  });
  return cy.get('@roleId');
});

Cypress.Commands.add('addCapabilitiesToNewRoleApi', (roleId, capabilityIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'roles/capabilities',
    body: {
      roleId,
      capabilityIds: [...capabilityIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('addCapabilitySetsToNewRoleApi', (roleId, capabilitySetIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'roles/capabilities',
    body: {
      roleId,
      capabilitySetIds: [...capabilitySetIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});
