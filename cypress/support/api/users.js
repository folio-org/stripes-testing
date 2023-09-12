import uuid from 'uuid';
import Users from '../fragments/users/users';
import getRandomPostfix from '../utils/stringTools';
import { FULFILMENT_PREFERENCES } from '../constants';

Cypress.Commands.add('getUsers', (searchParams) => {
  cy.okapiRequest({
    path: 'users',
    searchParams,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    Cypress.env('users', body.users);
    return body.users;
  });
});

Cypress.Commands.add('getUserServicePoints', (userId) => {
  cy.okapiRequest({
    path: 'service-points-users',
    searchParams: {
      query: `(userId==${userId})`,
    },
  }).then(({ body }) => {
    Cypress.env('userServicePoints', body.servicePointsUsers);
    return body.servicePointsUsers;
  });
});

Cypress.Commands.add('getUserGroups', (searchParams) => {
  cy.okapiRequest({
    path: 'groups',
    searchParams,
  }).then(({ body }) => {
    Cypress.env('userGroups', body.usergroups);
    return body.usergroups[0].id;
  });
});

Cypress.Commands.add('getFirstUserGroupId', (searchParams, patronGroupName) => {
  cy.okapiRequest({
    path: 'groups',
    searchParams,
  }).then((response) => {
    let userGroupIdx = 0;
    if (patronGroupName) {
      userGroupIdx =
        response.body.usergroups.findIndex(({ group }) => group === patronGroupName) || 0;
    }
    return response.body.usergroups[userGroupIdx].id;
  });
});

Cypress.Commands.add('overrideLocalSettings', (userId) => {
  const body = {
    module: '@folio/stripes-core',
    configName: 'localeSettings',
    enabled: true,
    value: '{"locale":"en-US","timezone":"UTC","currency":"USD"}',
    userId,
  };

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

Cypress.Commands.add('createTempUser', (permissions = [], patronGroupName) => {
  const userProperties = {
    username: `cypressTestUser${getRandomPostfix()}`,
    password: `Password${getRandomPostfix()}`,
  };

  cy.getAdminToken();

  cy.getFirstUserGroupId({ limit: patronGroupName ? 100 : 1 }, patronGroupName).then(
    (userGroupdId) => {
      const queryField = 'displayName';
      cy.getPermissionsApi({
        query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
      }).then((permissionsResponse) => {
        // Can be used to collect pairs of ui and backend permission names
        // cy.log('Initial permissions=' + permissions);
        // cy.log('internalPermissions=' + [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]);
        Users.createViaApi({
          ...Users.defaultUser,
          patronGroup: userGroupdId,
          username: userProperties.username,
          barcode: uuid(),
          personal: { ...Users.defaultUser.personal, lastName: userProperties.username },
        }).then((newUserProperties) => {
          userProperties.userId = newUserProperties.id;
          userProperties.barcode = newUserProperties.barcode;
          userProperties.firstName = newUserProperties.firstName;
          userProperties.lastName = newUserProperties.lastName;
          cy.createRequestPreference({
            defaultDeliveryAddressTypeId: null,
            defaultServicePointId: null,
            delivery: false,
            fulfillment: FULFILMENT_PREFERENCES.HOLD_SHELF,
            holdShelf: true,
            id: uuid(),
            userId: newUserProperties.id,
          });
          cy.setUserPassword(userProperties);
          cy.addPermissionsToNewUserApi({
            userId: userProperties.userId,
            permissions: [
              ...permissionsResponse.body.permissions.map(
                (permission) => permission.permissionName,
              ),
            ],
          });
          cy.overrideLocalSettings(userProperties.userId);
          cy.wrap(userProperties).as('userProperties');
        });
      });
    },
  );
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
