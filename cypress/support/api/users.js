import uuid from 'uuid';
import getRandomPostfix from '../utils/stringTools';

Cypress.Commands.add('getUsers', (searchParams) => {
  cy
    .okapiRequest({
      path: 'users',
      searchParams,
      isDefaultSearchParamsRequired: false
    })
    .then(({ body }) => {
      Cypress.env('users', body.users);
      return body.users;
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
      return body.servicePointsUsers;
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
      return body.usergroups[0].id;
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
      return body;
    });
});

Cypress.Commands.add('overrideLocalSettings', (userId) => {
  const body = { module: '@folio/stripes-core',
    configName: 'localeSettings',
    enabled: true,
    value: '{"locale":"en-US","timezone":"UTC","currency":"USD"}',
    userId };

  cy.okapiRequest({
    method: 'POST',
    path: 'configurations/entries',
    body,
  });
});

Cypress.Commands.add('updateUser', (userData) => {
  cy.okapiRequest({
    method: 'PUT',
    path: `users/${userData.id}`,
    body: userData,
  });
});

Cypress.Commands.add('createTempUser', (permissions = []) => {
  const userProperties = {
    username: `cypressTestUser${getRandomPostfix()}`,
    password: `Password${getRandomPostfix()}`,
    userId:''
  };

  cy.getAdminToken();

  cy.getFirstUserGroupId({ limit: 1 })
    .then((userGroupdId) => {
      const userData = {
        username: userProperties.username,
        active: true,
        barcode: uuid(),
        personal: {
          preferredContactTypeId: '002',
          firstName: 'testPermFirst',
          middleName: 'testMiddleName',
          lastName: userProperties.username,
          email: 'test@folio.org',
        },
        patronGroup: userGroupdId,
        departments: []
      };

      const queryField = 'displayName';
      cy.getPermissionsApi({ query: `(${queryField}="${permissions.join(`")or(${queryField}="`)}"))"` })
        .then((permissionsResponse) => {
          // Can be used to collect pairs of ui and backend permission names
          // cy.log('Initial permissions=' + permissions);
          // cy.log('internalPermissions=' + [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]);
          cy.createUserApi(userData)
            .then((userCreateResponse) => {
              userProperties.userId = userCreateResponse.id;
              userProperties.barcode = userCreateResponse.barcode;
              cy.setUserPassword(userProperties);
              cy.addPermissionsToNewUserApi({
                userId: userProperties.userId,
                permissions : [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]
              });
              cy.overrideLocalSettings(userProperties.userId);
              userProperties.barcode = userCreateResponse.barcode;
              cy.wrap(userProperties).as('userProperties');
            });
        });
    });
  return cy.get('@userProperties');
});

Cypress.Commands.add('getAddressTypesApi', (searchParams) => {
  cy.okapiRequest({
    path: 'addresstypes',
    searchParams,
  }).then(({ body }) => {
    return body.addressTypes;
  });
});

Cypress.Commands.add('createUserRequestPreferencesApi', (data) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'request-preference-storage/request-preference',
    body: data,
  }).then(({ body }) => {
    return body;
  });
});
