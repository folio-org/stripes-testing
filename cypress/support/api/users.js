import uuid from 'uuid';
import getRandomPostfix from '../utils/stringTools';

Cypress.Commands.add('getUsers', (searchParams) => {
  cy
    .okapiRequest({
      path: 'users',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('users', body.users);
    });
});

Cypress.Commands.add('getUserServicePoints', (userId) => {
  cy
    .okapiRequest({
      path: 'service-points-users',
      searchParams: {
        query: `(userId==${userId})`,
      },
    })
    .then(({ body }) => {
      Cypress.env('userServicePoints', body.servicePointsUsers);
    });
});

Cypress.Commands.add('getUserGroups', (searchParams) => {
  cy
    .okapiRequest({
      path: 'groups',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('userGroups', body.usergroups);
    });
});

Cypress.Commands.add('getFirstUserGroupId', (searchParams) => {
  cy.okapiRequest({
    path: 'groups',
    searchParams,
  }).then((response) => {
    return response.body.usergroups[0].id;
  });
});

Cypress.Commands.add('deleteUser', (userId) => {
  cy
    .okapiRequest({
      method: 'DELETE',
      path: `bl-users/by-id/${userId}`,
    });
});

Cypress.Commands.add('createUserApi', (user) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'users',
      body: user,
    })
    .then(({ body }) => {
      Cypress.env('user', body);
    });
});

Cypress.Commands.add('createTempUser', (permissions) => {
  const userProperties = {
    username: `cypressTestUser${getRandomPostfix()}`,
    password: `Password${getRandomPostfix()}`,
    userId:''
  };

  cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

  cy.getFirstUserGroupId({ limit: 1 })
    .then((userGroupdId) => {
      const userData = {
        username: userProperties.username,
        active: true,
        barcode: uuid(),
        personal: {
          preferredContactTypeId: '002',
          firstName: 'testPermFirst',
          lastName: userProperties.username,
          email: 'test@folio.org',
        },
        patronGroup: userGroupdId,
        departments: []
      };

      const queryField = 'displayName';
      cy.getPermissionsApi({ query: `(${queryField}="${permissions.join(`")or(${queryField}="`)}"))"` })
        .then((permissionsResponse) => {
          cy.createUserApi(userData)
            .then((userCreateResponse) => {
              userProperties.userId = userCreateResponse.body.id;
              cy.setUserPassword(userProperties);
              cy.addPermissionsToNewUserApi({
                userId: userProperties.userId,
                permissions : [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]
              });
              cy.wrap(userProperties).as('userProperties');
            });
        });
    });
  return cy.get('@userProperties');
});
