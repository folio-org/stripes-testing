import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { capitalize } from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        roleName: `AT_C1474742_UserRole_${randomPostfix}`,
        // Step 2: single app selected in create
        appPlatformComplete: 'app-platform-complete',
        // Step 3: capability set that pulls in capabilities from multiple apps
        capabilitySetStep3: {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Circulation-Log Log-Event',
          action: CAPABILITY_ACTIONS.MANAGE,
          visibleCapabilities: [],
          allCapabilities: [],
          // unique app name prefixes (without version) derived from API
          uniqueApps: [],
        },
        // Step 9: second capability set that pulls in capabilities from additional apps
        capabilitySetStep9: {
          table: CAPABILITY_TYPES.PROCEDURAL,
          resource: 'UI-Inventory Item',
          action: CAPABILITY_ACTIONS.EXECUTE,
          visibleCapabilities: [],
          allCapabilities: [],
          uniqueApps: [],
        },
        user: null,
        createdRoleId: null,
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsView,
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      before('Create user and fetch capability data', () => {
        cy.getAdminToken();

        // resolve apps and visible capabilities for each cross-app set
        [testData.capabilitySetStep3, testData.capabilitySetStep9].forEach((set) => {
          set.type = set.table;
          cy.getCapabilitySetIdViaApi(set).then((setId) => {
            cy.getCapabilitiesForSetApi(setId).then(({ body }) => {
              const mapCapab = (c) => ({
                table: capitalize(c.type),
                resource: c.resource,
                action: capitalize(c.action),
              });
              set.visibleCapabilities = body.capabilities.filter((c) => c.visible).map(mapCapab);
              set.allCapabilities = body.capabilities.map(mapCapab);
              // strip version suffix from application names (e.g. "app-platform-complete-1.0.0" → "app-platform-complete")
              set.uniqueApps = [
                ...new Set(
                  body.capabilities.map((c) => c.applicationId.replace(/-\d+\.\d+.*$/, '')),
                ),
              ];
            });
          });
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        });
      });

      after('Delete user and role', () => {
        cy.getAdminToken(false);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId, true);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1474742 All additionally added applications and capabilities from them are correctly displayed on edit role page (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1474742'] },
        () => {
          // Keeping for debug purposes
          cy.log(
            'Applications in capabs for the first set:\n' +
              JSON.stringify(testData.capabilitySetStep3.uniqueApps, null, 2),
          );
          cy.log(
            'Applications in capabs for the second set:\n' +
              JSON.stringify(testData.capabilitySetStep9.uniqueApps, null, 2),
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });

          // Step 1: Open Create role, enter name
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);

          // Step 2: Select only app-platform-complete; capabilities for it appear
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.appPlatformComplete);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.waitCapabilitiesShown();

          // Step 3: Check a cross-app capability set; its capabilities from the selected app appear
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetStep3);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep3);

          // Step 4: Save & close
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);

          // Step 5: view mode shows visible capabilities directly related to the set's own app
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.capabilitySetStep3.visibleCapabilities.length.toString(),
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilitySetStep3.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep3);

          // Step 6: Open Edit
          AuthorizationRoles.openForEdit();

          // Step 7: Edit mode — default shows only visible capabs (own-app only)
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep3);
          testData.capabilitySetStep3.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 8: App modal shows all apps (incl. those only in hidden caps) before toggling
          AuthorizationRoles.clickSelectApplication();
          testData.capabilitySetStep3.uniqueApps.forEach((appName) => {
            AuthorizationRoles.checkApplicationShownInModal(appName, true, true);
          });
          AuthorizationRoles.clickCancelInModal();

          // Toggle hidden capabs — now all caps incl. hidden are shown and checked
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });
          AuthorizationRoles.verifyAppNamesInCapabilityTables(
            testData.capabilitySetStep3.uniqueApps,
          );
          testData.capabilitySetStep3.allCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 9: Select second cross-app capability set and save
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetStep9);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep9);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);

          // Step 10: view mode shows visible capabilities from both sets' own apps
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            (
              testData.capabilitySetStep3.visibleCapabilities.length +
              testData.capabilitySetStep9.visibleCapabilities.length
            ).toString(),
          );
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          [
            ...testData.capabilitySetStep3.visibleCapabilities,
            ...testData.capabilitySetStep9.visibleCapabilities,
          ].forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('2');
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep3);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep9);

          // Step 11: Open Edit again
          AuthorizationRoles.openForEdit();

          // Step 12: Edit mode — default shows only visible capabs; verify visible first
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep3);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetStep9);
          [
            ...testData.capabilitySetStep3.visibleCapabilities,
            ...testData.capabilitySetStep9.visibleCapabilities,
          ].forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 13: App modal shows all apps before toggling hidden
          AuthorizationRoles.clickSelectApplication();
          const allUniqueApps = [
            ...new Set([
              ...testData.capabilitySetStep3.uniqueApps,
              ...testData.capabilitySetStep9.uniqueApps,
            ]),
          ];
          allUniqueApps.forEach((appName) => {
            AuthorizationRoles.checkApplicationShownInModal(appName, true, true);
          });
          AuthorizationRoles.clickCancelInModal();

          // Toggle hidden capabs — all capabs incl. hidden from both sets are checked
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });
          AuthorizationRoles.verifyAppNamesInCapabilityTables(allUniqueApps);
          [
            ...testData.capabilitySetStep3.allCapabilities,
            ...testData.capabilitySetStep9.allCapabilities,
          ].forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });
        },
      );
    });
  });
});
