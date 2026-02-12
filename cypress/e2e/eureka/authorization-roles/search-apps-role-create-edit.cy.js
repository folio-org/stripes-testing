import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Capabilities from '../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        editRoleName: `AT_C825331_SearchRole_${getRandomPostfix()}`,
        searchTerms: {
          leading: 'app-a',
          middle: 'platform',
          trailing: 'acquisitions',
          existingLeading: 'app-pl',
          existingMiddle: 'pl',
          existingTrailing: 'complete',
        },
        selectedApplication: 'app-platform-complete',
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

          // Create an existing role to edit with a selected application
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

      after('Delete user and role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.editRoleId, true);
      });

      it(
        'C825331 [UIPSELAPP-14] Search for application while creating/editing of the role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C825331'] },
        () => {
          const leadingWordApps = allTenantApplications.filter((app) => app.startsWith(testData.searchTerms.leading));
          const middleWordApps = allTenantApplications.filter((app) => app.includes(testData.searchTerms.middle));
          const trailingWordApps = allTenantApplications.filter((app) => app.endsWith(testData.searchTerms.trailing));
          const existingLeadingWordApps = allTenantApplications.filter((app) => app.startsWith(testData.searchTerms.existingLeading));
          const existingMiddleWordApps = allTenantApplications.filter((app) => app.includes(testData.searchTerms.existingMiddle));
          const existingTrailingWordApps = allTenantApplications.filter((app) => app.endsWith(testData.searchTerms.existingTrailing));

          // Steps 1-2: Go to Settings → Authorization roles and click +New
          AuthorizationRoles.clickNewButton();
          // Step 3: Click "Select application" button
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();

          // Step 4: Input leading word of existing application
          // Step 5: Click "Search" button
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.leading);
          // Verify results contain applications with the leading word
          AuthorizationRoles.checkApplicationCountInModal(leadingWordApps.length);
          leadingWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });

          // Step 6: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          // Verify all applications are shown
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 7: Input middle word of existing application > Search
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.middle);
          // Verify results contain applications with the middle word
          AuthorizationRoles.checkApplicationCountInModal(middleWordApps.length);
          middleWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });

          // Step 8: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          // Verify all applications are shown
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 9: Input trailing word of existing application > Search
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.trailing);
          // Verify results contain applications with the trailing word
          AuthorizationRoles.checkApplicationCountInModal(trailingWordApps.length);
          trailingWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });

          // Step 10: Close "Select application" modal > Close "Create role" modal
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.closeRoleCreateView();

          // Select existing role with at least 1 capability/set
          AuthorizationRoles.searchRole(testData.editRoleName);
          AuthorizationRoles.clickOnRoleName(testData.editRoleName);

          // Step 11: Actions > Edit
          AuthorizationRoles.openForEdit();
          cy.wait(1000);

          // Step 12: Click "Select application" button
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();

          // Step 13: Input leading word of already existing and selected application
          // Step 14: Click "Search" button
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.existingLeading);
          AuthorizationRoles.checkApplicationCountInModal(existingLeadingWordApps.length);
          existingLeadingWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });
          AuthorizationRoles.checkApplicationShownInModal(testData.selectedApplication, true, true);

          // Step 15: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          // Verify all applications are shown
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 16: Input middle word of already existing and selected application > Search
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.existingMiddle);
          AuthorizationRoles.checkApplicationCountInModal(existingMiddleWordApps.length);
          existingMiddleWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });
          AuthorizationRoles.checkApplicationShownInModal(testData.selectedApplication, true, true);

          // Step 17: Click "Reset all" button
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          // Verify all applications are shown
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 18: Input trailing word of already existing and selected application > Search
          AuthorizationRoles.searchForAppInModal(testData.searchTerms.existingTrailing);
          AuthorizationRoles.checkApplicationCountInModal(existingTrailingWordApps.length);
          existingTrailingWordApps.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });
          AuthorizationRoles.checkApplicationShownInModal(testData.selectedApplication, true, true);
        },
      );
    });
  });
});
