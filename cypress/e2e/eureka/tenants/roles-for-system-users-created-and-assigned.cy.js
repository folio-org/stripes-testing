describe('Eureka', () => {
  describe('Tenants', () => {
    const testData = {
      tenant: Cypress.env('OKAPI_TENANT'),
      systemRoleName: (moduleName) => `default-system-role-${moduleName}`,
    };

    const expectedSystemRoles = [];
    const allExistingCapabilities = [];
    let existingRoles;

    function getDataFromAppDescriptor(appDescriptor) {
      [...appDescriptor.moduleDescriptors, ...appDescriptor.uiModuleDescriptors].forEach(
        (moduleDescriptor) => {
          if (
            moduleDescriptor.metadata &&
            Object.prototype.hasOwnProperty.call(moduleDescriptor.metadata, 'user')
          ) {
            const moduleName = moduleDescriptor.id.replace(/-\d+\.\d+\.\d+.*/, '');
            if (!expectedSystemRoles.some((role) => role.moduleName === moduleName)) {
              expectedSystemRoles.push({
                moduleName,
                permissionNames: moduleDescriptor.metadata.user.permissions,
              });
            }
          }
        },
      );
    }

    before('Get general data', () => {
      cy.getAdminToken();
      cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
        appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
          getDataFromAppDescriptor(appDescriptor);
        });
      });
      cy.getAuthorizationRoles({ limit: 500 }).then((roles) => {
        existingRoles = roles;
      });
      cy.getCapabilitiesApi(5000, true, { customTimeout: 60_000 }).then((capabs) => {
        allExistingCapabilities.push(...capabs.filter((capab) => capab.endpoints.length));
      });
    });

    it(
      'C784506 System user is created for each module which declares one (eureka)',
      { tags: ['criticalPath', 'eureka', 'shiftLeft', 'C784506'] },
      () => {
        const modulesMissingUser = [];

        cy.then(() => {
          cy.getAdminToken();
          expectedSystemRoles.forEach((expectedSystemRole) => {
            cy.getUsers({ query: `username=="${expectedSystemRole.moduleName}"` }).then((users) => {
              if (users.length !== 1) {
                modulesMissingUser.push({
                  moduleName: expectedSystemRole.moduleName,
                  issue: `expected exactly 1 system user, found ${users.length}`,
                });
              }
            });
          });
        })
          .then(() => {
            // Log missing/unexpected system users for debug purposes:
            cy.log(
              modulesMissingUser.length
                ? 'Modules MISSING a system user:\n' + JSON.stringify(modulesMissingUser, null, 2)
                : 'All modules have exactly one system user',
            );
          })
          .then(() => {
            expect(modulesMissingUser, 'Modules missing a system user').to.have.length(0);
          });
      },
    );

    it(
      'C1559253 Default system role is created and assigned for each existing system user (eureka)',
      { tags: ['criticalPath', 'eureka', 'shiftLeft', 'C1559253'] },
      () => {
        const roleIssues = [];

        cy.then(() => {
          cy.getAdminToken();
          expectedSystemRoles.forEach((expectedSystemRole) => {
            cy.getUsers({ query: `username=="${expectedSystemRole.moduleName}"` }).then((users) => {
              // A missing/duplicate system user is already reported by C784506
              if (users.length !== 1) return;

              const matchingRoles = existingRoles.filter(
                (role) => role.name === testData.systemRoleName(expectedSystemRole.moduleName),
              );
              if (matchingRoles.length !== 1) {
                roleIssues.push({
                  moduleName: expectedSystemRole.moduleName,
                  issue: `expected exactly 1 default role, found ${matchingRoles.length}`,
                });
                return;
              }
              expectedSystemRole.roleId = matchingRoles[0].id;

              cy.getAuthorizationRolesForUserApi(users[0].id).then((userRolesResponse) => {
                const systemUserRoleIds = userRolesResponse.body.userRoles.map(
                  (role) => role.roleId,
                );
                if (!systemUserRoleIds.includes(expectedSystemRole.roleId)) {
                  roleIssues.push({
                    moduleName: expectedSystemRole.moduleName,
                    issue: 'default role not assigned to system user',
                  });
                }
              });
            });
          });
        })
          .then(() => {
            // Log role creation/assignment issues for debug purposes:
            cy.log(
              roleIssues.length
                ? 'Modules MISSING a default role or its assignment to the system user:\n' +
                    JSON.stringify(roleIssues, null, 2)
                : 'All default roles created and assigned correctly',
            );
          })
          .then(() => {
            expect(
              roleIssues,
              'Modules missing a default role or its assignment to the system user',
            ).to.have.length(0);
          });
      },
    );

    it(
      'C1559254 Default system role of each existing system user has expected capabilities (eureka)',
      { tags: ['criticalPath', 'eureka', 'shiftLeft', 'C1559254'] },
      () => {
        const missingPermissionsData = [];

        cy.then(() => {
          cy.getAdminToken();
          expectedSystemRoles.forEach((expectedSystemRole) => {
            const matchingRoles = existingRoles.filter(
              (role) => role.name === testData.systemRoleName(expectedSystemRole.moduleName),
            );
            // A missing default role is already reported by C1559253
            if (matchingRoles.length !== 1) return;
            const roleId = matchingRoles[0].id;

            cy.getCapabilitiesForRoleApi(roleId, {
              limit: 5000,
              expand: true,
            }).then((assignedCapabilitiesResponse) => {
              const assignedPermissionNames = assignedCapabilitiesResponse.body.capabilities.map(
                (capab) => capab.permission,
              );
              const expectedPermissionNames = expectedSystemRole.permissionNames.filter(
                (permission) => allExistingCapabilities.find((capab) => capab.permission === permission),
              );
              const missingPermissions = expectedPermissionNames.filter(
                (permission) => !assignedPermissionNames.includes(permission),
              );
              if (missingPermissions.length) {
                missingPermissionsData.push({
                  moduleName: expectedSystemRole.moduleName,
                  missingPermissions,
                });
              }
            });
          });
        })
          .then(() => {
            // Log missing permissions for debug purposes:
            cy.log(
              missingPermissionsData.length
                ? 'MISSING permissions:\n' + JSON.stringify(missingPermissionsData, null, 2)
                : 'No missing permissions',
            );
          })
          .then(() => {
            expect(missingPermissionsData, 'Roles with missing permissions').to.have.length(0);
          });
      },
    );
  });
});
