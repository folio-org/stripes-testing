import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C916226_UserRole_${getRandomPostfix()}`,
        originalApplications: ['app-acquisitions', 'app-platform-minimal'],
        originalCapabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Orders Titles',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'UI-Authorization-Roles Settings',
            action: CAPABILITY_ACTIONS.VIEW,
          },
        ],
        setIds: [],
        capabilitiesForFirstApp: [],
        capabilitiesForSecondApp: [],
      };

      function isCapabilityFromApp(capability, appName, resultArray) {
        const appRegExp = new RegExp(`${appName}-\\d\\..+`);
        return (
          appRegExp.test(capability.applicationId) &&
          !resultArray.find((el) => el.name === capability.name)
        );
      }

      const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesSettingsAdmin];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            testData.originalCapabilitySets.forEach((set) => {
              set.type = set.table;
              cy.getCapabilitySetIdViaApi(set).then((setId) => {
                testData.setIds.push(setId);
              });
            });
          });
        });
      });

      before('Assign capabilities and login', () => {
        cy.then(() => {
          cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.setIds);
          cy.getCapabilitiesForSetApi(testData.setIds[0], {
            limit: 5000,
          }).then((response) => {
            response.body.capabilities.forEach((capability) => {
              if (
                isCapabilityFromApp(
                  capability,
                  testData.originalApplications[0],
                  testData.capabilitiesForFirstApp,
                )
              ) {
                testData.capabilitiesForFirstApp.push(capability);
              }
            });
          });
          cy.getCapabilitiesForSetApi(testData.setIds[1], {
            limit: 5000,
          }).then((response) => {
            response.body.capabilities.forEach((capability) => {
              if (
                isCapabilityFromApp(
                  capability,
                  testData.originalApplications[1],
                  testData.capabilitiesForSecondApp,
                )
              ) {
                testData.capabilitiesForSecondApp.push(capability);
              }
            });
          });
        }).then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C916226 [UISAUTHCOM-69] Display warning after unselecting application while editing a role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C916226'] },
        () => {
          testData.originalCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[1],
            true,
            true,
          );
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[0], false);
          // TO DO: Replace `undefined` with `testData.capabilitiesForFirstApp.length` when UIROLES-166 is fixed
          AuthorizationRoles.clickSaveInModalAndCheckUnselectModal(
            testData.originalApplications[0],
            undefined,
            1,
          );
          AuthorizationRoles.cancelAppUnselection();
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[0],
            true,
            false,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[1],
            true,
            true,
          );

          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[0], true);
          AuthorizationRoles.selectApplicationInModal(testData.originalApplications[1], false);
          // TO DO: Replace `undefined` with `testData.capabilitiesForSecondApp.length` when UIROLES-166 is fixed
          AuthorizationRoles.clickSaveInModalAndCheckUnselectModal(
            testData.originalApplications[1],
            undefined,
            1,
          );
          AuthorizationRoles.confirmAppUnselection();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.originalApplications[0]]);
        },
      );
    });
  });
});
