import getRandomPostfix from '../utils/stringTools';
import { AUTHORIZATION_ROLE_TYPES } from '../constants';

Cypress.Commands.add('getPermissionsApi', (searchParams) => {
  return cy.okapiRequest({
    path: 'perms/permissions',
    searchParams,
    isDefaultSearchParamsRequired: false,
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

Cypress.Commands.add(
  'getCapabilitiesApi',
  (limit = 5000, ignoreDummyCapabs = true, { customTimeout = null, query } = {}) => {
    let constructedQuery = ignoreDummyCapabs ? 'dummyCapability==false' : '';
    if (query) constructedQuery += constructedQuery ? ` and (${query})` : query;
    const requestData = {
      method: 'GET',
      path: 'capabilities',
      searchParams: {
        limit,
        query: constructedQuery,
      },
      isDefaultSearchParamsRequired: false,
    };
    if (customTimeout) requestData.customTimeout = customTimeout;
    cy.okapiRequest(requestData).then(({ body }) => {
      cy.wrap(body.capabilities).as('capabs');
    });
    return cy.get('@capabs');
  },
);

Cypress.Commands.add('getCapabilitySetsApi', (limit = 1500, { query } = {}) => {
  const searchParams = { limit };
  if (query) searchParams.query = query;
  cy.okapiRequest({
    method: 'GET',
    path: 'capability-sets',
    isDefaultSearchParamsRequired: false,
    searchParams,
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

Cypress.Commands.add(
  'addCapabilitySetsToNewUserApi',
  (userId, capabilitySetIds, ignoreErrors = false) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'users/capability-sets',
      body: {
        userId,
        capabilitySetIds: [...capabilitySetIds],
      },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: !ignoreErrors,
    });
  },
);

Cypress.Commands.add('addRolesToNewUserApi', (userId, roleIds, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'roles/users',
    body: {
      userId,
      roleIds: [...roleIds],
    },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add('getUserRoleIdByNameApi', (roleName) => {
  cy.okapiRequest({
    method: 'GET',
    path: `roles?limit=1000&query=name=="${roleName}"`,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    if (body.roles.length) return body.roles[0].id;
    else return null;
  });
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
    name = `AT_UserRole_${getRandomPostfix()}`,
    description = `Test_Auto_Description_${getRandomPostfix()}`,
    type = null,
    ignoreErrors = false,
  ) => {
    const roleBody = {
      name,
      description,
    };
    if (type) {
      roleBody.type = type;
    }
    cy.okapiRequest({
      method: 'POST',
      path: 'roles',
      isDefaultSearchParamsRequired: false,
      body: roleBody,
      failOnStatusCode: !ignoreErrors,
    }).then(({ body }) => {
      cy.wrap(body).as('role');
    });
    return cy.get('@role');
  },
);

Cypress.Commands.add('updateAuthorizationRoleApi', (roleId, requestBody) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `roles/${roleId}`,
    body: requestBody,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  }).then((response) => {
    return response;
  });
});

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

Cypress.Commands.add('getCapabilitiesForUserApi', (userId, ignoreErrors = false) => {
  cy.okapiRequest({
    path: `users/${userId}/capabilities`,
    searchParams: {
      limit: 10,
      offset: 0,
    },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add('getCapabilitySetsForUserApi', (userId, ignoreErrors = false) => {
  cy.okapiRequest({
    path: `users/${userId}/capability-sets`,
    searchParams: {
      limit: 10,
      offset: 0,
    },
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then(({ status, body }) => {
    return {
      status,
      body,
    };
  });
});

Cypress.Commands.add(
  'getCapabilityIdViaApi',
  ({ type, resource, action }, ignoreDummyCapabs = true) => {
    const query = ignoreDummyCapabs
      ? `resource=="${resource}" and action==${action.toUpperCase()} and type==${type.toUpperCase()} and dummyCapability==false`
      : `resource=="${resource}" and action==${action.toUpperCase()} and type==${type.toUpperCase()}`;
    cy.okapiRequest({
      path: 'capabilities',
      searchParams: {
        query,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      cy.wrap(body.capabilities[0].id).as('capabId');
    });
    return cy.get('@capabId');
  },
);

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

Cypress.Commands.add('updateCapabilitiesForRoleApi', (roleId, capabilityIds) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `roles/${roleId}/capabilities`,
    body: {
      capabilityIds,
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('updateCapabilitySetsForRoleApi', (roleId, capabilitySetIds) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `roles/${roleId}/capability-sets`,
    body: {
      capabilitySetIds,
    },
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getCapabilitiesForRoleApi', (roleId, searchParams = { limit: 1000 }) => {
  cy.okapiRequest({
    path: `roles/${roleId}/capabilities`,
    isDefaultSearchParamsRequired: false,
    searchParams,
  });
});

Cypress.Commands.add('getCapabilitySetsForRoleApi', (roleId) => {
  cy.okapiRequest({
    path: `roles/${roleId}/capability-sets`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getAuthorizationRoles', (searchParams = { limit: 500 }) => {
  cy.okapiRequest({
    path: 'roles',
    isDefaultSearchParamsRequired: false,
    searchParams,
  }).then(({ body }) => {
    cy.wrap(body.roles).as('roles');
  });
  return cy.get('@roles');
});

Cypress.Commands.add('getAuthorizationRoleApi', (roleId) => {
  cy.okapiRequest({
    path: `roles/${roleId}`,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('shareRoleApi', (consotiaId, { id, name, description = '' }) => {
  cy.okapiRequest({
    method: 'POST',
    path: `/consortia/${consotiaId}/sharing/roles`,
    isDefaultSearchParamsRequired: false,
    body: {
      roleId: id,
      roleName: name,
      url: '/roles',
      payload: {
        id,
        name,
        description,
        type: AUTHORIZATION_ROLE_TYPES.REGULAR.toUpperCase(),
      },
    },
  });
});

Cypress.Commands.add(
  'shareRoleCapabilitiesApi',
  (consortiaId, { id, name, capabilitiesArray = [] }) => {
    cy.okapiRequest({
      method: 'POST',
      path: `/consortia/${consortiaId}/sharing/roles/capabilities`,
      isDefaultSearchParamsRequired: false,
      body: {
        roleId: id,
        roleName: name,
        url: '/roles/capabilities',
        payload: {
          roleId: id,
          capabilityNames: capabilitiesArray,
        },
      },
    });
  },
);

Cypress.Commands.add(
  'shareRoleCapabilitySetsApi',
  (consortiaId, { id, name, capabilitySetsArray = [] }) => {
    cy.okapiRequest({
      method: 'POST',
      path: `/consortia/${consortiaId}/sharing/roles/capability-sets`,
      isDefaultSearchParamsRequired: false,
      body: {
        roleId: id,
        roleName: name,
        url: '/roles/capability-sets',
        payload: {
          roleId: id,
          capabilitySetNames: capabilitySetsArray,
        },
      },
    });
  },
);

Cypress.Commands.add(
  'deleteSharedRoleApi',
  ({ id, name, description = '' }, ignoreErrors = false) => {
    cy.getConsortiaId().then((consortiaId) => {
      cy.okapiRequest({
        method: 'DELETE',
        path: `/consortia/${consortiaId}/sharing/roles/${id}`,
        isDefaultSearchParamsRequired: false,
        body: {
          roleId: id,
          roleName: name,
          url: '/roles',
          payload: {
            id,
            name,
            description,
            type: AUTHORIZATION_ROLE_TYPES.CONSORTIUM.toUpperCase(),
          },
        },
        failOnStatusCode: !ignoreErrors,
      });
    });
  },
);

Cypress.Commands.add('shareRoleWithCapabilitiesApi', ({ id, name, description = '' }) => {
  let consortiaId;
  let capabilities;
  let capabilitySets;
  cy.then(() => {
    cy.getConsortiaId().then((consId) => {
      consortiaId = consId;
    });
    cy.getCapabilitiesForRoleApi(id).then(({ body }) => {
      capabilities = body.capabilities.map((capab) => capab.name);
    });
    cy.getCapabilitySetsForRoleApi(id).then(({ body }) => {
      capabilitySets = body.capabilitySets.map((set) => set.name);
    });
  }).then(() => {
    cy.shareRoleApi(consortiaId, { id, name, description }).then(() => {
      cy.wait(3000);
      cy.shareRoleCapabilitiesApi(consortiaId, { id, name, capabilitiesArray: capabilities }).then(
        () => {
          cy.wait(3000);
          cy.shareRoleCapabilitySetsApi(consortiaId, {
            id,
            name,
            capabilitySetsArray: capabilitySets,
          }).then(() => {
            cy.wait(3000);
          });
        },
      );
    });
  });
});

Cypress.Commands.add('verifyAssignedRolesCountForUserApi', (userId, rolesCount) => {
  return cy.recurse(
    () => {
      return cy.okapiRequest({
        path: 'roles/users',
        searchParams: {
          query: `userId==${userId}`,
        },
        isDefaultSearchParamsRequired: false,
      });
    },
    (response) => response.body.userRoles.length === rolesCount,
    {
      limit: 12,
      delay: 5000,
      timeout: 65000,
    },
  );
});

Cypress.Commands.add(
  'getCapabilitiesForSetApi',
  (capabilitySetId, searchParams = { limit: 1000 }) => {
    cy.okapiRequest({
      path: `capability-sets/${capabilitySetId}/capabilities`,
      isDefaultSearchParamsRequired: false,
      searchParams,
    });
  },
);
