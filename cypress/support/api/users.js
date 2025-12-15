import uuid from 'uuid';
import Users from '../fragments/users/users';
import getRandomPostfix from '../utils/stringTools';
import permissionsList from '../dictionary/permissions';
import { FULFILMENT_PREFERENCES, DEFAULT_LOCALE_STRING } from '../constants';

Cypress.Commands.add('getUsers', (searchParams) => {
  return cy
    .okapiRequest({
      path: 'users',
      searchParams,
      isDefaultSearchParamsRequired: false,
    })
    .then(({ body }) => {
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

Cypress.Commands.add('getAdminUserId', () => {
  return cy.getAdminUserDetails().then((user) => {
    return user.id;
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
    isDefaultSearchParamsRequired: false,
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
    value: DEFAULT_LOCALE_STRING,
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
  (permissions = [], patronGroupName = 'staff', userType = 'staff', barcode = true, email) => {
    return cy.createTempUserParameterized(undefined, permissions, {
      patronGroupName,
      userType,
      barcode,
      email,
    });
  },
);

Cypress.Commands.add('createTempUserParameterized', (userModel, permissions = [], params) => {
  const parameters = {
    patronGroupName: 'staff',
    userType: 'staff',
    barcode: true,
    email: undefined,
    ...params,
  };

  const userProperties = {
    username: `at_username_${getRandomPostfix()}`,
    password: 'password',
  };
  let userBody;
  if (!userModel) {
    userBody = {
      ...Users.defaultUser,
      type: parameters.userType,
      username: userProperties.username,
      personal: { ...Users.defaultUser.personal, lastName: userProperties.username },
    };
    if (parameters.barcode) {
      userBody.barcode = uuid();
    }
    if (parameters.email) {
      userBody.personal.email = parameters.email;
    } else {
      // if a user should have only unique email
      // userBody.personal.email = `test_${getRandomPostfix()}@test.com`;
    }
  } else {
    userBody = userModel;
    userProperties.username = userBody.username;
  }

  if (!Cypress.env('ecsEnabled')) {
    cy.getAdminToken();
  }

  cy.getFirstUserGroupId(
    { limit: parameters.patronGroupName ? 1000 : 1 },
    parameters.patronGroupName,
  ).then((userGroup) => {
    userBody.patronGroup = userGroup.id;

    Users.createViaApi(userBody).then((newUserProperties) => {
      userProperties.userId = newUserProperties.id;
      userProperties.barcode = newUserProperties.barcode;
      userProperties.firstName = newUserProperties.firstName;
      userProperties.lastName = newUserProperties.lastName;
      userProperties.preferredFirstName = newUserProperties.preferredFirstName;
      userProperties.personal = userBody.personal;
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
      if (Cypress.env('runAsAdmin') && Cypress.env('eureka')) {
        cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then((roleId) => {
          cy.updateRolesForUserApi(userProperties.userId, [roleId]);
        });
      } else if (Cypress.env('eureka')) {
        let capabilitiesIds;
        let capabilitySetsIds;
        const permissionNames = [];
        permissions.forEach((permission) => {
          for (const permissionObject in permissionsList) {
            // eslint-disable-next-line no-prototype-builtins
            if (permissionsList.hasOwnProperty(permissionObject)) {
              const { gui, internal } = permissionsList[permissionObject];
              if (gui.toLowerCase().trim() === permission.toLowerCase().trim()) {
                permissionNames.push(internal);
                break;
              }
            }
          }
        });

        if (permissions.length && !permissionNames.length) cy.log('Warning: permissions not found in list!');

        if (permissionNames.length) {
          cy.okapiRequest({
            path: 'capabilities',
            searchParams: {
              query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
              limit: 100,
            },
            isDefaultSearchParamsRequired: false,
          }).then((responseCapabs) => {
            capabilitiesIds = responseCapabs.body.capabilities.map((el) => el.id);
            cy.okapiRequest({
              path: 'capability-sets',
              searchParams: {
                query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
                limit: 100,
              },
              isDefaultSearchParamsRequired: false,
            }).then((responseSets) => {
              capabilitySetsIds = responseSets.body.capabilitySets.map((el) => el.id);

              permissionNames.forEach((permissionName) => {
                // eslint-disable-next-line no-unused-expressions
                cy.expect(
                  responseCapabs.body.capabilities.filter(
                    (capab) => capab.permission === permissionName,
                  ).length > 0 ||
                    responseSets.body.capabilitySets.filter(
                      (set) => set.permission === permissionName,
                    ).length > 0,
                  `Capabilities/sets found for "${permissionName}"`,
                ).to.be.true;
              });

              if (capabilitiesIds.length === 0) {
                cy.log('Warning: Capabilities not found!');
              } else {
                cy.addCapabilitiesToNewUserApi(userProperties.userId, capabilitiesIds);
              }

              if (capabilitySetsIds.length === 0) {
                cy.log('Warning: Capability sets not found!');
              } else {
                cy.addCapabilitySetsToNewUserApi(userProperties.userId, capabilitySetsIds);
              }
            });
          });
        }
      } else {
        cy.wait(3000);
        const queryField = 'displayName';
        // Can be used to collect pairs of ui and backend permission names
        // cy.log('Initial permissions=' + permissions);
        // cy.log('internalPermissions=' + [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]);
        cy.getPermissionsApi({
          query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
        }).then((permissionsResponse) => {
          cy.addPermissionsToNewUserApi({
            userId: userProperties.userId,
            permissions: [
              ...permissionsResponse.body.permissions.map(
                (permission) => permission.permissionName,
              ),
            ],
          });
        });
      }
      userProperties.userGroup = userGroup;
      cy.overrideLocalSettings(userProperties.userId);
      cy.wrap(userProperties).as('userProperties');
    });
    return cy.get('@userProperties');
  });
});

// shouldReplace - if true, existing permissions will be replaced with new ones
// if false, new permissions will be added to existing ones
Cypress.Commands.add('assignPermissionsToExistingUser', (userId, permissions = []) => {
  if (Cypress.env('runAsAdmin') && Cypress.env('eureka')) {
    cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then((roleId) => {
      cy.updateRolesForUserApi(userId, [roleId]);
    });
  } else if (Cypress.env('eureka')) {
    let capabilitiesIds;
    let capabilitySetsIds;
    const permissionNames = [];
    permissions.forEach((permission) => {
      for (const permissionObject in permissionsList) {
        // eslint-disable-next-line no-prototype-builtins
        if (permissionsList.hasOwnProperty(permissionObject)) {
          const { gui, internal } = permissionsList[permissionObject];
          if (gui.includes(permission)) {
            permissionNames.push(internal);
            break;
          }
        }
      }
    });

    if (permissionNames.length) {
      cy.okapiRequest({
        path: 'capabilities',
        searchParams: {
          query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
        },
        isDefaultSearchParamsRequired: false,
      }).then((responseCapabs) => {
        capabilitiesIds = responseCapabs.body.capabilities.map((el) => el.id);
        cy.okapiRequest({
          path: 'capability-sets',
          searchParams: {
            query: `(permission=="${permissionNames.join('")or(permission=="')}")`,
          },
          isDefaultSearchParamsRequired: false,
        }).then((responseSets) => {
          capabilitySetsIds = responseSets.body.capabilitySets.map((el) => el.id);

          permissionNames.forEach((permissionName) => {
            // eslint-disable-next-line no-unused-expressions
            cy.expect(
              responseCapabs.body.capabilities.filter(
                (capab) => capab.permission === permissionName,
              ).length > 0 ||
                responseSets.body.capabilitySets.filter((set) => set.permission === permissionName)
                  .length > 0,
              `Capabilities/sets found for "${permissionName}"`,
            ).to.be.true;
          });

          if (capabilitiesIds.length === 0) {
            cy.log('Capabilities not found ');
          } else {
            cy.addCapabilitiesToNewUserApi(userId, capabilitiesIds);
          }

          if (capabilitySetsIds.length === 0) {
            cy.log('Capability sets not found ');
          } else {
            cy.addCapabilitySetsToNewUserApi(userId, capabilitySetsIds);
          }
        });
      });
    }
  } else {
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
  }
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
  cy.getUsers({ limit: 1, query: `"username"=="${Cypress.env('diku_login')}"` })
    .then((user) => {
      const { lastName, firstName } = user[0].personal;
      return `${lastName}${(firstName && `, ${firstName}`) || ''}`;
    })
    .then((record) => {
      Cypress.env('adminSourceRecord', record);
      return record;
    });
});

Cypress.Commands.add(
  'createUserGroupApi',
  ({
    groupName = `AT_UserGroup_${getRandomPostfix()}`,
    description = `Description ${getRandomPostfix()}`,
    expirationOffsetInDays = 0,
  } = {}) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'groups',
      body: {
        group: groupName,
        desc: description,
        expirationOffsetInDays,
      },
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      return body;
    });
  },
);

Cypress.Commands.add('deleteUserGroupApi', (groupId, ignoreErrors = false) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `groups/${groupId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  });
});

Cypress.Commands.add(
  'assignCapabilitiesToExistingUser',
  (userId, capabilities = [], capabilitySets = []) => {
    const capabilityIds = [];
    const capabilitySetIds = [];
    cy.then(() => {
      for (const capab of capabilities) {
        cy.getCapabilityIdViaApi({
          type: capab.type,
          resource: capab.resource,
          action: capab.action,
        }).then((capabId) => capabilityIds.push(capabId));
      }
      for (const capabSet of capabilitySets) {
        cy.getCapabilitySetIdViaApi({
          type: capabSet.type,
          resource: capabSet.resource,
          action: capabSet.action,
        }).then((capabSetId) => capabilitySetIds.push(capabSetId));
      }
    }).then(() => {
      if (capabilityIds.length) cy.updateCapabilitiesForUserApi(userId, capabilityIds);
      if (capabilitySetIds.length) cy.updateCapabilitySetsForUserApi(userId, capabilitySetIds);
    });
  },
);

Cypress.Commands.add('checkIfUserHasKeycloakApi', (userId, ignoreErrors = true) => {
  cy.okapiRequest({
    path: `users-keycloak/auth-users/${userId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then((response) => {
    return response;
  });
});

Cypress.Commands.add('promoteUserToKeycloakApi', (userId, ignoreErrors = false) => {
  cy.okapiRequest({
    method: 'POST',
    path: `users-keycloak/auth-users/${userId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: !ignoreErrors,
  }).then((response) => {
    return response;
  });
});

Cypress.Commands.add('createUserWithoutKeycloakInEurekaApi', (userBody) => {
  cy.okapiRequest({
    method: 'POST',
    path: 'users',
    body: userBody,
    isDefaultSearchParamsRequired: false,
  }).then(({ body }) => {
    return body.id;
  });
});

Cypress.Commands.add('getUserWithBlUsersByUsername', (username) => {
  cy.okapiRequest({
    path: `bl-users/by-username/${username}`,
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response;
  });
});

Cypress.Commands.add('getKeycloakUsersInfo', () => {
  cy.okapiRequest({
    path: 'users-keycloak/_self?expandPermissions=true&fullPermissions=true',
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response;
  });
});

Cypress.Commands.add('getUserMigrations', () => {
  cy.okapiRequest({
    path: 'users-keycloak/migrations',
    isDefaultSearchParamsRequired: false,
  }).then((response) => {
    return response;
  });
});
