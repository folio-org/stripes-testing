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

    // Uncomment for saving missing permissions in case of failure
    // after(() => {
    //   cy.writeFile(
    //     './missing-permissions.json',
    //     JSON.stringify(
    //       expectedSystemRoles
    //         .filter((role) => role.missingPermissions.length)
    //         .map((role) => ({
    //           moduleName: role.moduleName,
    //           missingPermissions: role.missingPermissions,
    //         })),
    //       null,
    //       2,
    //     ),
    //   );
    // });

    it(
      'C784506 Default roles for system users created and assigned (eureka)',
      { tags: ['criticalPath', 'eureka', 'shiftLeft', 'C784506'] },
      () => {
        cy.getAdminToken();
        expectedSystemRoles.forEach((expectedSystemRole) => {
          const matchingRoles = existingRoles.filter(
            (role) => role.name === testData.systemRoleName(expectedSystemRole.moduleName),
          );
          expect(matchingRoles.length).to.eq(1);
          expectedSystemRole.roleId = matchingRoles[0].id;

          cy.getCapabilitiesForRoleApi(expectedSystemRole.roleId, {
            limit: 5000,
            expand: true,
          }).then((assignedCapabilitiesResponse) => {
            const assignedPermissionNames = assignedCapabilitiesResponse.body.capabilities.map(
              (capab) => capab.permission,
            );
            const expectedPermissionNames = expectedSystemRole.permissionNames.filter(
              (permission) => allExistingCapabilities.find((capab) => capab.permission === permission),
            );
            expect(
              expectedPermissionNames.every((expectedPermName) => assignedPermissionNames.includes(expectedPermName)),
            ).to.eq(true);

            // Uncomment for retrieving missing permissions in case of failure
            // expectedSystemRole.missingPermissions = [];
            // expectedPermissionNames.forEach((permission) => {
            //   if (!assignedPermissionNames.includes(permission)) {
            //     expectedSystemRole.missingPermissions.push(permission);
            //   }
            // });

            cy.getUsers({ query: `username=="${expectedSystemRole.moduleName}"` }).then((users) => {
              cy.getAuthorizationRolesForUserApi(users[0].id).then((userRolesResponse) => {
                const systemUserRoleIds = userRolesResponse.body.userRoles.map(
                  (role) => role.roleId,
                );
                expect(systemUserRoleIds).to.include(expectedSystemRole.roleId);
              });
            });
          });
        });
      },
    );
  });
});
