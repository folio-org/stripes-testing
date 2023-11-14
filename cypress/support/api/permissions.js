import uuid from 'uuid';

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
  cy.okapiRequest({
    method: 'POST',
    path: 'perms/users',
    body: userAndPermissions,
  });
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
    });
  },
);
