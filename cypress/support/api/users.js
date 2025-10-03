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

Cypress.Commands.add('getAdminUserDetails', () => {
  if (!Cypress.env('adminUserDetails')) {
    return cy
      .getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` })
      .then((users) => {
        Cypress.env('adminUserDetails', users[0]);
        return users[0];
      });
  } else {
    return Cypress.env('adminUserDetails');
  }
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
    return response.body.usergroups[userGroupIdx];
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

Cypress.Commands.add(
  'createTempUser',
  (permissions = [], patronGroupName, userType = 'staff', barcode = true) => {
    const userProperties = {
      username: `cypressTestUser${getRandomPostfix()}`,
      password: 'password',
    };
    if (!Cypress.env('ecsEnabled')) {
      cy.getAdminToken();
    }

    cy.getFirstUserGroupId({ limit: patronGroupName ? 100 : 1 }, patronGroupName).then(
      (userGroup) => {
        const queryField = 'displayName';
        cy.getPermissionsApi({
          query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
        }).then((permissionsResponse) => {
          // Can be used to collect pairs of ui and backend permission names
          // cy.log('Initial permissions=' + permissions);
          // cy.log('internalPermissions=' + [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]);
          const userBody = {
            ...Users.defaultUser,
            patronGroup: userGroup.id,
            type: userType,
            username: userProperties.username,
            personal: { ...Users.defaultUser.personal, lastName: userProperties.username },
          };

          if (barcode) {
            userBody.barcode = uuid();
          }

          Users.createViaApi(userBody).then((newUserProperties) => {
            userProperties.userId = newUserProperties.id;
            userProperties.barcode = newUserProperties.barcode;
            userProperties.firstName = newUserProperties.firstName;
            userProperties.lastName = newUserProperties.lastName;
            userProperties.preferredFirstName = newUserProperties.preferredFirstName;
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
            userProperties.userGroup = userGroup;
            cy.overrideLocalSettings(userProperties.userId);
            cy.wrap(userProperties).as('userProperties');
          });
        });
      },
    );
    return cy.get('@userProperties');
  },
);

Cypress.Commands.add('assignPermissionsToExistingUser', (userId, permissions = []) => {
  const queryField = 'displayName';
  cy.getPermissionsApi({
    query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
  }).then((permissionsResponse) => {
    cy.getUserPermissions(userId).then((permissionId) => {
      cy.addPermissionsToExistingUserApi(permissionId, userId, [
        ...permissionsResponse.body.permissions.map((permission) => permission.permissionName),
      ]);
    });
  });
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

Cypress.Commands.add('getAdminSourceRecord', () => {
  cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` })
    .then((user) => {
      const { lastName, firstName } = user[0].personal;
      return `${lastName}${(firstName && `, ${firstName}`) || ''}`;
    })
    .then((record) => {
      Cypress.env('adminSourceRecord', record);
      return record;
    });
});
