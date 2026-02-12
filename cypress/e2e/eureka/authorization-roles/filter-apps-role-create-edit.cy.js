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
        editRoleName: `AT_C825332_UserRole_${getRandomPostfix()}`,
        selectedApplications: ['app-platform-minimal', 'app-platform-complete'],
        tenant: Cypress.env('OKAPI_TENANT'),
        roleCapabilities: [Capabilities.circulationRulesView],
        capabIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      const allTenantApplications = [];

      before('Create user and existing role', () => {
        cy.getAdminToken();
        cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
          appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
            allTenantApplications.push(appDescriptor.name);
          });
        });
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

          // Create an existing role to edit
          cy.createAuthorizationRoleApi(testData.editRoleName).then((role) => {
            testData.editRoleId = role.id;
            testData.roleCapabilities.forEach((capability) => {
              cy.getCapabilityIdViaApi(capability).then((capabId) => {
                testData.capabIds.push(capabId);
              });
            });
          });
        });
      });

      before('Assign capabilities and login', () => {
        cy.addCapabilitiesToNewRoleApi(testData.editRoleId, testData.capabIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user and roles', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.editRoleId, true);
      });

      it(
        'C825332 [UIPSELAPP-14] Filtering applications while creating/editing role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C825332'] },
        () => {
          const unselectedAppsFirst = allTenantApplications.filter(
            (app) => !testData.selectedApplications.includes(app),
          );
          const unselectedAppsSecond = allTenantApplications.filter(
            (app) => app !== testData.selectedApplications[1],
          );
          const additionalApplications = unselectedAppsFirst.slice(0, 2);

          // Steps 1-2: Go to Settings → Authorization roles and click +New
          AuthorizationRoles.clickNewButton();
          // Step 3: Click "Select application" button
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();

          // Step 4: Select several applications, then click "Unselected" filter
          AuthorizationRoles.selectApplicationInModal(testData.selectedApplications[0]);
          AuthorizationRoles.selectApplicationInModal(testData.selectedApplications[1]);
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.UNSELECTED);
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, false);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });

          // Step 5: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, false);

          // Step 6: Click on "Selected" variant
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationCountInModal(0);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();

          // Step 7: Click (x) close button right to the "Application selected status"
          AuthorizationRoles.clearFilterInSelectAppModal();
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, false);

          // Step 8: Click "Save and close" button
          AuthorizationRoles.clickSaveInModal();

          // Step 9: Click "Select application" button again
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );

          // Step 10: Click on "Unselected" variant
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.UNSELECTED);
          AuthorizationRoles.checkApplicationCountInModal(unselectedAppsFirst.length);
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, false);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });

          // Step 11: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, false);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);

          // Step 12: Select several more applications > Click on "Selected" variant
          AuthorizationRoles.selectApplicationInModal(additionalApplications[0]);
          AuthorizationRoles.selectApplicationInModal(additionalApplications[1]);
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationCountInModal(testData.selectedApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });

          // Step 13: Click (x) close button right to the "Application selected status"
          AuthorizationRoles.clearFilterInSelectAppModal();
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[0],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[0], true, true);
          AuthorizationRoles.checkApplicationShownInModal(additionalApplications[1], true, true);

          // Close modal and role creation window
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.closeRoleCreateView();

          // Steps 14-15: Select existing role > Actions > Edit
          AuthorizationRoles.searchRole(testData.editRoleName);
          AuthorizationRoles.clickOnRoleName(testData.editRoleName);
          AuthorizationRoles.openForEdit();
          cy.wait(1000);

          // Step 16: Click "Select application" button
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );

          // Step 17: Click on "Unselected" variant
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.UNSELECTED);
          AuthorizationRoles.checkApplicationCountInModal(unselectedAppsSecond.length);
          AuthorizationRoles.checkApplicationShownInModal(testData.selectedApplications[1], false);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });

          // Step 18: Click "Unselected" variant again
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.UNSELECTED,
            false,
          );
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);

          // Step 19: Click "Selected" variant
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({ resetAll: true, search: false });
          AuthorizationRoles.checkApplicationCountInModal(1);
          AuthorizationRoles.checkApplicationShownInModal(
            testData.selectedApplications[1],
            true,
            true,
          );

          // Step 20: Click "Selected" variant again
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.SELECTED,
            false,
          );
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          AuthorizationRoles.checkClearFilterButtonInSelectAppModal(false);
        },
      );
    });
  });
});
