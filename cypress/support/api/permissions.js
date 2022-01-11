Cypress.Commands.add('getPermissionsApi', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'perms/permissions',
      searchParams,
    });
});

Cypress.Commands.add('addPermissionsToNewUserApi', (userAndPermissions) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'perms/users',
      body: userAndPermissions,
    });
});
