import uuid from 'uuid';
import Users from '../fragments/users/users';
import getRandomPostfix from '../utils/stringTools';
import permissionsList from '../dictionary/permissions';
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

Cypress.Commands.add('getFirstUserGroup', (searchParams, patronGroupName) => {
  if (patronGroupName) searchParams.query = `group=="${patronGroupName}"`;
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

Cypress.Commands.add('createTempUser', (permissions = [], patronGroupName, userType = 'staff') => {
  const userProperties = {
    username: `cypresstestuser${getRandomPostfix()}`,
    password: 'password',
  };

  if (!Cypress.env('ecsEnabled') || Cypress.env('eureka')) {
    cy.getAdminToken();
  }

  cy.getFirstUserGroup({ limit: patronGroupName ? 1000 : 1 }, patronGroupName).then(
    ({ id, group }) => {
      const queryField = 'displayName';
      cy.getPermissionsApi({
        query: `(${queryField}=="${permissions.join(`")or(${queryField}=="`)}"))"`,
      }).then((permissionsResponse) => {
        // Can be used to collect pairs of ui and backend permission names
        // cy.log('Initial permissions=' + permissions);
        // cy.log('internalPermissions=' + [...permissionsResponse.body.permissions.map(permission => permission.permissionName)]);
        Users.createViaApi({
          ...Users.defaultUser,
          patronGroup: id,
          type: userType,
          username: userProperties.username,
          barcode: uuid(),
          personal: { ...Users.defaultUser.personal, lastName: userProperties.username },
        }).then((newUserProperties) => {
          userProperties.userId = newUserProperties.id;
          userProperties.barcode = newUserProperties.barcode;
          userProperties.firstName = newUserProperties.firstName;
          userProperties.lastName = newUserProperties.lastName;
          userProperties.patronGroup = group;
          userProperties.patronGroupId = id;
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
              if (Cypress.env('ecsEnabled')) {
                cy.recurse(
                  () => {
                    return cy.okapiRequest({
                      path: `users-keycloak/users/${userProperties.userId}`,
                      isDefaultSearchParamsRequired: false,
                    });
                  },
                  (response) => expect(response.body.id).to.eq(userProperties.userId),
                  {
                    limit: 10,
                    timeout: 40000,
                    delay: 1000,
                  },
                ).then(() => {
                  cy.wait(10000);
                  cy.updateRolesForUserApi(userProperties.userId, [roleId]);
                });
              } else cy.updateRolesForUserApi(userProperties.userId, [roleId]);
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

                  if (capabilitiesIds.length === 0) {
                    cy.log('Capabilities not found ');
                  } else {
                    cy.addCapabilitiesToNewUserApi(userProperties.userId, capabilitiesIds);
                  }

                  if (capabilitySetsIds.length === 0) {
                    cy.log('Capability sets not found ');
                  } else {
                    cy.addCapabilitySetsToNewUserApi(userProperties.userId, capabilitySetsIds);
                  }
                });
              });
            }
          } else {
            cy.wait(3000);
            cy.addPermissionsToNewUserApi({
              userId: userProperties.userId,
              permissions: [
                ...permissionsResponse.body.permissions.map(
                  (permission) => permission.permissionName,
                ),
              ],
            });
          }
          cy.overrideLocalSettings(userProperties.userId);
          cy.wrap(userProperties).as('userProperties');
        });
      });
      return cy.get('@userProperties');
    },
  );
});

Cypress.Commands.add('assignPermissionsToExistingUser', (userId, permissions = []) => {
  if (Cypress.env('runAsAdmin') && Cypress.env('eureka')) {
    cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then((roleId) => {
      if (Cypress.env('ecsEnabled')) {
        cy.recurse(
          () => {
            return cy.okapiRequest({
              path: `users-keycloak/users/${userId}`,
              isDefaultSearchParamsRequired: false,
            });
          },
          (response) => expect(response.body.id).to.eq(userId),
          {
            limit: 10,
            timeout: 40000,
            delay: 1000,
          },
        ).then(() => {
          cy.wait(10000);
          cy.updateRolesForUserApi(userId, [roleId]);
        });
      } else cy.updateRolesForUserApi(userId, [roleId]);
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
    groupName = `Auto Group ${getRandomPostfix()}`,
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

Cypress.Commands.add('deleteUserGroupApi', (groupId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `groups/${groupId}`,
    isDefaultSearchParamsRequired: false,
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

Cypress.Commands.add('deleteUserWithoutKeycloakInEurekaApi', (userId) => {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `users/${userId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
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
