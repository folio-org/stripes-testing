import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { capitalize } from '../../../support/utils/stringTools';
import AuthorizationRoles, {
  selectAppFilterOptions,
  selectAppAssignmentOptions,
} from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C1554520_UserRole_${getRandomPostfix()}`,
        appA: null,
        appB: null,
        appACapability: null,
        appBCapability: null,
        tenant: Cypress.env('OKAPI_TENANT'),
      };
      const allTenantApplications = [];
      const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesSettingsEdit];

      before('Create role and user', () => {
        cy.getAdminToken();

        cy.getApplicationsForTenantApi(testData.tenant, false).then((appsResponse) => {
          appsResponse.body.applicationDescriptors.forEach((appDescriptor) => {
            allTenantApplications.push(appDescriptor.name);
          });
        });

        // Fetch visible, non-dummy capabilities to discover apps and pick one capability per app.
        // "visible==true" ensures the capability has a checkbox in the role-edit UI.
        // limit=1000 is enough to surface at least 2 distinct apps without loading the full 5k set.
        cy.getCapabilitiesApi(1000, true, { query: 'visible==true' }).then((capabs) => {
          // Group capabilities by base app name.
          // applicationId looks something like "app-platform-minimal-1.0.0-SNAPSHOT.xxx";
          // replace(/-\d.*$/, '') strips the version suffix, giving "app-platform-minimal".
          const appsByName = {};
          capabs.forEach((cap) => {
            if (cap.applicationId) {
              const name = cap.applicationId.replace(/-\d.*$/, '');
              if (!appsByName[name]) appsByName[name] = [];
              appsByName[name].push(cap);
            }
          });
          const appNames = Object.keys(appsByName);
          testData.appA = appNames[0];
          testData.appB = appNames[1];

          // Build capability descriptors for selectCapabilityCheckbox().
          // capitalize() is needed because the API returns lowercase type/action
          // while the fragment's capabilityTables map uses title-case keys (e.g. 'Data').
          testData.appACapability = {
            table: capitalize(appsByName[testData.appA][0].type),
            resource: appsByName[testData.appA][0].resource,
            action: capitalize(appsByName[testData.appA][0].action),
          };
          testData.appBCapability = {
            table: capitalize(appsByName[testData.appB][0].type),
            resource: appsByName[testData.appB][0].resource,
            action: capitalize(appsByName[testData.appB][0].action),
          };
        });

        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
          });
        });
      });

      before('Login', () => {
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete role and user', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C1554520 [UISAUTHCOM-108] Filter applications in "Select application" modal by Selection and Assignment status (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1554520'] },
        () => {
          // Step 1: Open role for edit → Select application → verify modal, each app Unassigned
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          allTenantApplications.forEach((app) => {
            AuthorizationRoles.checkApplicationShownInModal(app);
          });
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.UNASSIGNED,
          );
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appB,
            selectAppAssignmentOptions.UNASSIGNED,
          );

          // Step 2: Collapse then expand "Application selection status" facet
          AuthorizationRoles.toggleAppSelectionStatusAccordion(false);
          AuthorizationRoles.toggleAppSelectionStatusAccordion(true);

          // Step 3: Select "Selected" filter → 0 applications found
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationCountInModal(0);

          // Step 4: Uncheck "Selected", check App A, recheck "Selected" → only App A (Unassigned)
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.SELECTED,
            false,
          );
          AuthorizationRoles.selectApplicationInModal(testData.appA);
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationCountInModal(1);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, true);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.UNASSIGNED,
          );

          // Step 5: Also check "Unselected" → all apps returned
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.UNSELECTED);
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 6: Click x on "Application selection status" filter → reset, all apps still shown
          AuthorizationRoles.clearFilterInSelectAppModal();
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 7: Check "Assigned" → 0 applications found
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppAssignmentOptions.ASSIGNED,
          );
          AuthorizationRoles.checkApplicationCountInModal(0);

          // Step 8: Uncheck "Assigned", check "Unassigned" → all apps returned
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppAssignmentOptions.ASSIGNED,
            false,
          );
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppAssignmentOptions.UNASSIGNED,
          );
          AuthorizationRoles.checkApplicationCountInModal(allTenantApplications.length);

          // Step 9: With "Unassigned" still active, also check "Selected" → only App A
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationCountInModal(1);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, true);

          // Step 10: Reset all, select App B, save modal → only App A and App B capabilities shown
          AuthorizationRoles.clickResetAllInSelectAppModal();
          AuthorizationRoles.selectApplicationInModal(testData.appB);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.appA, testData.appB]);

          // Step 11: Select 1 capability from each app, save role, re-edit, re-open modal
          // → App A and App B show "Assigned" with checked checkboxes
          AuthorizationRoles.selectCapabilityCheckbox(testData.appACapability);
          AuthorizationRoles.selectCapabilityCheckbox(testData.appBCapability);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter('2');
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.appACapability);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.appBCapability);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.appA, testData.appB]);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, true);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.ASSIGNED,
          );
          AuthorizationRoles.checkApplicationShownInModal(testData.appB, true, true);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appB,
            selectAppAssignmentOptions.ASSIGNED,
          );

          // Step 12: Uncheck App A → checkbox unchecked, Status column still shows "Assigned"
          AuthorizationRoles.selectApplicationInModal(testData.appA, false);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, false);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.ASSIGNED,
          );

          // Step 13: Select "Selected" filter → App B present and checked, App A absent
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.SELECTED);
          AuthorizationRoles.checkApplicationShownInModal(testData.appB, true, true);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, false);

          // Step 14: Switch to "Unselected" → App A present (Assigned, unchecked), App B absent
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppFilterOptions.SELECTED,
            false,
          );
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(selectAppFilterOptions.UNSELECTED);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, false);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.ASSIGNED,
          );
          AuthorizationRoles.checkApplicationShownInModal(testData.appB, false);

          // Step 15: Also check "Assigned" → only App A (unselected + assigned)
          AuthorizationRoles.toggleFilterOptionInSelectAppModal(
            selectAppAssignmentOptions.ASSIGNED,
          );
          AuthorizationRoles.checkApplicationCountInModal(1);
          AuthorizationRoles.checkApplicationShownInModal(testData.appA, true, false);
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.ASSIGNED,
          );

          // Step 16: Save & close modal → Continue on warning → only App B capabilities remain
          AuthorizationRoles.clickSaveInModal({ confirmUnselect: true });
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.appB]);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.appBCapability);

          // Step 17: Click Select application again → filters reset, App A Status still "Assigned"
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifyFiltersResetInSelectAppModal();
          AuthorizationRoles.checkButtonsEnabledInSelectAppModal({
            resetAll: false,
            search: false,
          });
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.ASSIGNED,
          );

          // Step 18: Close modal, save role, re-edit, re-open → App A Unassigned, App B Assigned
          AuthorizationRoles.clickCancelInModal();
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter('1');
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.appBCapability);
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.appB]);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appA,
            selectAppAssignmentOptions.UNASSIGNED,
          );
          AuthorizationRoles.checkApplicationStatusInModal(
            testData.appB,
            selectAppAssignmentOptions.ASSIGNED,
          );
        },
      );
    });
  });
});
