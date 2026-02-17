import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  selectAppFilterOptions,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Capabilities from '../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C825339_UserRole_${getRandomPostfix()}`,
        originalApplications: ['app-platform-minimal', 'app-platform-complete'],
        searchQuery: 'Complete',
        tenant: Cypress.env('OKAPI_TENANT'),
        roleCapabilities: [Capabilities.circulationRulesView, Capabilities.capabilitiesManage],
        capabIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      const allTenantApplications = [];

      before('Create role, user', () => {
        cy.getAdminToken();
        cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
          appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
            allTenantApplications.push(appDescriptor.name);
          });
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            testData.roleCapabilities.forEach((capability) => {
              cy.getCapabilityIdViaApi(capability).then((capabId) => {
                testData.capabIds.push(capabId);
              });
            });
          });
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.roleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      afterEach('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C825339 [UIPSELAPP-14] Filtering and searching applications while editing role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C825339'] },
        () => {
          const newApplications = allTenantApplications.filter((app) => {
            return (
              !testData.originalApplications.includes(app) &&
              app.includes(testData.searchQuery.toLowerCase())
            );
          });

          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
          cy.wait(1000);
          AuthorizationRoles.clickSelectApplication();

          AuthorizationRoles.verifySelectApplicationModal();
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
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
          AuthorizationRoles.checkApplicationCountInModal(2);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });

          AuthorizationRoles.searchForAppInModal(testData.searchQuery.toUpperCase());
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationCountInModal(1);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();

          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.SELECTED,
            false,
          );
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: true });
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(newApplications[0], true, false);
          AuthorizationRoles.checkApplicationCountInModal(1 + newApplications.length);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);

          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.UNSELECTED,
            true,
          );
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: true });
          AuthorizationRoles.checkApplicationShownInModal(newApplications[0], true, false);
          AuthorizationRoles.checkApplicationCountInModal(newApplications.length);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();

          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.UNSELECTED,
            false,
          );
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: true });
          AuthorizationRoles.checkApplicationShownInModal(
            testData.originalApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(newApplications[0], true, false);
          AuthorizationRoles.checkApplicationCountInModal(1 + newApplications.length);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);
        },
      );
    });
  });
});
