import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { capitalize } from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import Modals from '../../../support/fragments/modals';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const applicationName = 'app-platform-minimal';
      const testData = {
        roleName: `AT_C1395071_UserRole_${randomPostfix}`,
        // capability set 1: selected in step 1
        capabilitySetA: {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Notes Item',
          action: CAPABILITY_ACTIONS.EDIT,
          visibleCapabilities: [],
          allCapabilities: [],
        },
        // capability set 2: selected in step 1
        capabilitySetB: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Notes Settings',
          action: CAPABILITY_ACTIONS.EDIT,
          visibleCapabilities: [],
          allCapabilities: [],
        },
        // capability set with mix of visible/hidden capabilities (steps 6-11)
        mixedCapabilitySet: {
          table: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Authorization-Roles Settings',
          action: CAPABILITY_ACTIONS.VIEW,
          visibleCapabilities: [],
          allCapabilities: [],
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
        cy.clearLocalStorage();
        cy.window().then((w) => w.sessionStorage.clear());
        cy.getAdminToken();

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        });

        [testData.capabilitySetA, testData.capabilitySetB, testData.mixedCapabilitySet].forEach(
          (set) => {
            set.type = set.table;
            cy.getCapabilitySetIdViaApi(set).then((setId) => {
              cy.getCapabilitiesForSetApi(setId).then(({ body }) => {
                set.visibleCapabilities = body.capabilities
                  .filter((c) => c.visible)
                  .map((c) => ({
                    table: capitalize(c.type),
                    resource: c.resource,
                    action: capitalize(c.action),
                  }));
                set.allCapabilities = body.capabilities.map((c) => ({
                  table: capitalize(c.type),
                  resource: c.resource,
                  action: capitalize(c.action),
                }));
              });
            });
          },
        );
      });

      after('Delete user and role', () => {
        cy.getAdminToken(false);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId, true);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1395071 [UISAUTHCOM-98] Unselecting capability set during creating of the role (eureka)',
        { tags: ['criticalPath', 'eureka', 'C1395071'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });

          // Open Create role pane, fill name, select application
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationName);
          AuthorizationRoles.clickSaveInModal();

          // Step 1: Select capability sets A and B
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetB);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetB);

          // Step 2: Uncheck set A — modal opens; set stays checked
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA, {
            isSelected: true,
          });
          AuthorizationRoles.verifyUnselectSetConfirmModal(
            testData.capabilitySetA,
            testData.capabilitySetA.visibleCapabilities.length,
          );
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);

          // Step 3: Click outside modal — modal stays open, set stays checked
          Modals.clickOutsideModal();
          AuthorizationRoles.checkUnselectSetConfirmModalShown(true);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);

          // Step 4: Press Esc — modal closes, set stays checked
          Modals.closeModalWithEscapeIfAny();
          AuthorizationRoles.checkUnselectSetConfirmModalShown(false);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);

          // Step 5: Uncheck set A again, click Cancel — modal closes, set stays checked
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA, {
            isSelected: true,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(true);
          AuthorizationRoles.clickCancelInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);

          // Step 6: Select the mixed capability set (visible+hidden); only visible appear in grid
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.mixedCapabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.mixedCapabilitySet);
          testData.mixedCapabilitySet.visibleCapabilities.forEach((capab) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
          });

          // Step 7: Uncheck mixed set with hidden capabilities OFF — modal count = visible only
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.mixedCapabilitySet, {
            isSelected: true,
          });
          AuthorizationRoles.verifyUnselectSetConfirmModal(
            testData.mixedCapabilitySet,
            testData.mixedCapabilitySet.visibleCapabilities.length,
          );

          // Step 8: Cancel — mixed set stays checked
          AuthorizationRoles.clickCancelInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.mixedCapabilitySet);

          // Step 9: Enable "Show hidden capabilities"
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });

          // Step 10: Uncheck mixed set with hidden capabilities ON — modal count > visible-only count
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.mixedCapabilitySet, {
            isSelected: true,
          });
          AuthorizationRoles.verifyUnselectSetConfirmModal(
            testData.mixedCapabilitySet,
            testData.mixedCapabilitySet.allCapabilities.length,
          );

          // Step 11: Continue without "Do not display again" — mixed set unchecked; A and B unaffected
          AuthorizationRoles.clickContinueInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.mixedCapabilitySet, false);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetB);

          // Step 12: Uncheck set A — modal still appears (not suppressed yet)
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA, {
            isSelected: true,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(true);

          // Step 13: Check "Do not display again", then Continue
          AuthorizationRoles.toggleCheckboxInUnselectSetConfirmModal(true);
          AuthorizationRoles.clickContinueInUnselectSetConfirmModal();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA, false);

          // Step 14: Uncheck set B — modal suppressed, immediate uncheck
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetB, {
            isSelected: false,
          });
          AuthorizationRoles.checkUnselectSetConfirmModalShown(false);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetB, false);

          // Step 15: Save — role created; capability sets accordion reflects final state
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');

          // Step 16: Refresh — suppression persists in same session
          cy.reload();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          cy.wait(3000);
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySetA, {
            isSelected: false,
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySetA, false);
          AuthorizationRoles.checkUnselectSetConfirmModalShown(false);
        },
      );
    });
  });
});
