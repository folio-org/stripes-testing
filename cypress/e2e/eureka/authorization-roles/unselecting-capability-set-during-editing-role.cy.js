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
      const applicationName = 'app-platform-minimal';
      const testData = {
        roleName: `AT_C1395070_UserRole_${randomPostfix}`,
        // initial capability set assigned to the role via API
        initialCapabilitySet: {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Notes Item',
          action: CAPABILITY_ACTIONS.EDIT,
          visibleCapabilities: [],
        },
        // second capability set for step 4: different set from the same application
        secondCapabilitySet: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings',
          action: CAPABILITY_ACTIONS.VIEW,
          visibleCapabilities: [],
        },
        // third capability set for steps 10-13 (suppress check)
        thirdCapabilitySet: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Notes Settings',
          action: CAPABILITY_ACTIONS.EDIT,
        },
        capabSetIds: [],
        roleId: null,
        user: null,
      };

      const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesSettingsEdit];

      before('Create role with initial capability set, create user', () => {
        cy.clearLocalStorage();
        cy.window().then((w) => w.sessionStorage.clear());
        cy.getAdminToken();
        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        });

        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;
          testData.initialCapabilitySet.type = testData.initialCapabilitySet.table;
          cy.getCapabilitySetIdViaApi(testData.initialCapabilitySet).then((setId) => {
            testData.capabSetIds.push(setId);
            cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
            cy.getCapabilitiesForSetApi(setId).then(({ body }) => {
              testData.initialCapabilitySet.visibleCapabilities = body.capabilities
                .filter((capab) => capab.visible)
                .map((c) => ({
                  table: capitalize(c.type),
                  resource: c.resource,
                  action: capitalize(c.action),
                }));
            });
          });

          testData.secondCapabilitySet.type = testData.secondCapabilitySet.table;
          cy.getCapabilitySetIdViaApi(testData.secondCapabilitySet).then((setId) => {
            cy.getCapabilitiesForSetApi(setId).then(({ body }) => {
              testData.secondCapabilitySet.visibleCapabilities = body.capabilities
                .filter((capab) => capab.visible)
                .map((c) => ({
                  table: capitalize(c.type),
                  resource: c.resource,
                  action: capitalize(c.action),
                }));
            });
          });
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken(false);
        cy.deleteAuthorizationRoleApi(testData.roleId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1395070 [UISAUTHCOM-98] Unselecting capability set during editing of the role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C1395070'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });

          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
          // counter equals visible capabilities in the initial set
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.initialCapabilitySet.visibleCapabilities.length.toString(),
          );

          // Step 1: Open edit
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.initialCapabilitySet);
          cy.wait(3000);

          // Step 2: Uncheck the initial capability set — confirmation modal should appear
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.initialCapabilitySet, {
            isSelected: true,
          });
          AuthorizationRoles.verifyUnselectSetConfirmModal(
            testData.initialCapabilitySet,
            testData.initialCapabilitySet.visibleCapabilities.length,
          );
          // capability set stays checked
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.initialCapabilitySet);

          // Step 3: Click Continue — set and capabilities become unchecked
          AuthorizationRoles.clickContinueInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
            testData.initialCapabilitySet,
            false,
          );

          // Step 4: Select a different capability set — no confirmation modal expected
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.secondCapabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.secondCapabilitySet);
          // initial set capabilities are unchecked; second set capabilities become checked
          testData.initialCapabilitySet.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab, false);
          });
          testData.secondCapabilitySet.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 5: Save; step 6: verify counter reflects second set's visible capabilities
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.secondCapabilitySet);
          AuthorizationRoles.verifyCapabilitySetTableAbsent(testData.initialCapabilitySet.table);
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            testData.secondCapabilitySet.visibleCapabilities.length.toString(),
          );

          // Step 7: Re-open edit — confirm second capability set and its capabilities are checked
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.secondCapabilitySet);
          testData.secondCapabilitySet.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 8: Uncheck the second capability set — modal appears with correct counter
          // Steps 9: Check "Do not display this message again" then Continue
          // click to trigger modal
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.secondCapabilitySet, {
            isSelected: true,
          });
          AuthorizationRoles.verifyUnselectSetConfirmModal(
            testData.secondCapabilitySet,
            testData.secondCapabilitySet.visibleCapabilities.length,
          );
          AuthorizationRoles.toggleCheckboxInUnselectSetConfirmModal(true);
          AuthorizationRoles.clickContinueInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(
            testData.secondCapabilitySet,
            false,
          );

          // Step 10: Select thirdCapabilitySet and then uncheck it — modal should NOT appear (suppressed)
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.thirdCapabilitySet);
          // uncheck without confirmation expected (suppressed for session)
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet, {
            isSelected: false,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(false);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.thirdCapabilitySet, false);

          // Step 11: Save
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);

          // Step 12: Refresh — suppression persists within the same session
          cy.reload();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          cy.wait(3000);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet, {
            isSelected: false,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(false);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.thirdCapabilitySet, false);

          // Step 13: Log out and log in again — suppression resets; modal appears again
          cy.logout();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationName);
          AuthorizationRoles.clickSaveInModal();
          // After re-login the modal should show again for any capability set uncheck
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.thirdCapabilitySet);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.thirdCapabilitySet, {
            isSelected: true,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(true);
        },
      );
    });
  });
});
