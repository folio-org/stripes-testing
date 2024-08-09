import getRandomPostfix from '../utils/stringTools';

Cypress.Commands.add('getPermissionsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'perms/permissions',
    searchParams,
  });
});

Cypress.Commands.add('getUserPermissions', (targetUserId) => {
  cy.okapiRequest({
    method: 'GET',
    path: `perms/users/${targetUserId}?full=true&indexField=userId`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.id;
  });
});

Cypress.Commands.add('addPermissionsToNewUserApi', (userAndPermissions) => {
  if (Cypress.env('runAsAdmin') && Cypress.env('eureka')) {
    cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then((roleId) => {
      cy.addRolesToNewUserApi(userAndPermissions.userId, [roleId]);
    });
  } else {
    cy.okapiRequest({
      method: 'POST',
      path: 'perms/users',
      body: userAndPermissions,
    });
  }
});

Cypress.Commands.add(
  'addPermissionsToExistingUserApi',
  (permissionId, targetUserId, permissionsToSet) => {
    cy.okapiRequest({
      method: 'PUT',
      path: `perms/users/${permissionId}`,
      body: {
        id: permissionId,
        userId: targetUserId,
        permissions: permissionsToSet,
      },
      isDefaultSearchParamsRequired: false,
    });
  },
);

Cypress.Commands.add('getCapabilitiesApi', (limit = 3000) => {
  cy.okapiRequest({
    method: 'GET',
    path: `capabilities?limit=${limit}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilities).as('capabs');
  });
  return cy.get('@capabs');
});

Cypress.Commands.add('getCapabilitySetsApi', (limit = 1000) => {
  cy.okapiRequest({
    method: 'GET',
    path: `capability-sets?limit=${limit}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilitySets).as('capabSets');
  });
  return cy.get('@capabSets');
});

Cypress.Commands.add(
  'addCapabilitiesToNewUserApi',
  (userId, capabilityIds, ignoreErrors = false) => {
    return cy.okapiRequest({
      method: 'POST',
      path: 'users/capabilities',
      body: {
        userId,
        capabilityIds: [...capabilityIds],
      },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
);

Cypress.Commands.add('addCapabilitySetsToNewUserApi', (userId, capabilitySetIds) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'users/capability-sets',
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
    path: 'roles/capability-sets',
    body: {
      roleId,
      capabilitySetIds: [...capabilitySetIds],
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('deleteCapabilitiesFromRoleApi', (roleId, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `roles/${roleId}/capabilities`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('deleteCapabilitySetsFromRoleApi', (roleId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `roles/${roleId}/capability-sets`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add(
  'createAuthorizationRoleApi',
  (
    name = `Test_Auto_Role_${getRandomPostfix()}`,
    description = `Test_Auto_Description_${getRandomPostfix()}`,
  ) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'roles',
      isDefaultSearchParamsRequired: false,
      body: {
        name,
        description,
      },
    }).then(({ body }) => {
      cy.wrap(body).as('role');
    });
    return cy.get('@role');
  },
);

Cypress.Commands.add('deleteAuthorizationRoleApi', (roleId, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `roles/${roleId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('getAuthorizationRolesForUserApi', (userId) => {
  cy.okapiRequest({
    path: `roles/users/${userId}`,
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('getCapabilitiesForUserApi', (userId) => {
  cy.okapiRequest({
    path: 'users/capabilities',
    searchParams: {
      query: `userId==${userId}`,
      limit: 10,
      offset: 0,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('getCapabilitySetsForUserApi', (userId) => {
  cy.okapiRequest({
    path: 'users/capability-sets',
    searchParams: {
      query: `userId==${userId}`,
      limit: 10,
      offset: 0,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('getCapabilityIdViaApi', ({ type, resource, action }) => {
  cy.okapiRequest({
    path: 'capabilities',
    searchParams: {
      query: `resource=="${resource}" and action==${action.toUpperCase()} and type==${type.toUpperCase()}`,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilities[0].id).as('capabId');
  });
  return cy.get('@capabId');
});

Cypress.Commands.add('getCapabilitySetIdViaApi', ({ type, resource, action }) => {
  cy.okapiRequest({
    path: 'capability-sets',
    searchParams: {
      query: `resource=="${resource}" and action==${action.toUpperCase()} and type==${type.toUpperCase()}`,
    },
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    cy.wrap(body.capabilitySets[0].id).as('capabSetId');
  });
  return cy.get('@capabSetId');
});

Cypress.Commands.add('updateRolesForUserApi', (userId, roleIds, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `roles/users/${userId}`,
    body: {
      userId,
      roleIds: [...roleIds],
    },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('deleteRolesForUserApi', (userId) => {
  cy.okapiRequest({
    method: 'DELETE',
    path: `roles/users/${userId}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('updateCapabilitiesForUserApi', (userId, capabilityIds) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/${userId}/capabilities`,
    body: {
      capabilityIds,
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('updateCapabilitySetsForUserApi', (userId, capabilitySetIds) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/${userId}/capability-sets`,
    body: {
      capabilitySetIds,
    },
    isDefaultSearchParamsRequired: false,
  });
});
