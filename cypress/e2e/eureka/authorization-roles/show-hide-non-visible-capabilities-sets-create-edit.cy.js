import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix, { capitalize } from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        roleName: `AT_C1504463_UserRole_${randomPostfix}`,
        applicationName: 'app-platform-minimal',
        // up to 10 visible capability sets for app-platform-minimal (step 2, 5, 7)
        visibleCapabilitySets: [],
        // up to 10 hidden capability sets for app-platform-minimal (step 9, 10, 12)
        hiddenCapabilitySets: [],
        // up to 10 visible capabilities for app-platform-minimal (step 2, 5, 7)
        visibleCapabilities: [],
        // up to 10 hidden capabilities for app-platform-minimal (step 9, 10, 12)
        hiddenCapabilities: [],
        // visible capability count for visibleCapabilitySets[0] (used for step 6 counter)
        firstSetVisibleCapabsCount: 0,
        user: null,
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      before('Create user and fetch capability data', () => {
        cy.getAdminToken();

        const appQuery = `applicationId=="${testData.applicationName}-*"`;
        const mapItem = (c) => ({
          table: capitalize(c.type),
          resource: c.resource,
          action: capitalize(c.action),
        });

        cy.getCapabilitySetsApi(500, { query: `${appQuery} and visible==true` }).then((sets) => {
          testData.visibleCapabilitySets = (sets || []).slice(0, 10).map(mapItem);
          cy.getCapabilitiesForSetApi(sets[0].id).then(({ body }) => {
            testData.firstSetVisibleCapabsCount = body.capabilities.filter((c) => c.visible).length;
          });
        });
        cy.getCapabilitySetsApi(500, { query: `${appQuery} and visible==false` }).then((sets) => {
          testData.hiddenCapabilitySets = (sets || []).slice(0, 10).map(mapItem);
        });
        cy.getCapabilitiesApi(500, false, { query: `${appQuery} and visible==true` }).then(
          (capabs) => {
            testData.visibleCapabilities = (capabs || []).slice(0, 10).map(mapItem);
          },
        );
        cy.getCapabilitiesApi(500, false, { query: `${appQuery} and visible==false` }).then(
          (capabs) => {
            testData.hiddenCapabilities = (capabs || []).slice(0, 10).map(mapItem);
          },
        );

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        });
      });

      after('Delete user and role', () => {
        cy.getAdminToken(false);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C1504463 Show and hide non-visible capabilities and sets on create and edit page (eureka)',
        { tags: ['extendedPath', 'eureka', 'C1504463'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });

          // Step 1: New role — "Show hidden capabilities" disabled before app is selected
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.verifyShowHiddenCapabilitiesCheckbox({
            isChecked: false,
            isDisabled: true,
          });

          // Step 2: Select app — checkbox enabled; only visible sets/caps shown
          cy.intercept('GET', /\/capabilities(\?|$)/).as('getCapabilities');
          cy.intercept('GET', /\/capability-sets(\?|$)/).as('getCapabilitySets');
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.checkCapabilitySpinnersAbsent();
          AuthorizationRoles.verifyShowHiddenCapabilitiesCheckbox({
            isChecked: false,
            isDisabled: false,
          });

          // Step 3: verify API responses contain entities with visible=true and visible=false
          cy.wait('@getCapabilities').then(({ response }) => {
            const caps = response.body.capabilities;
            expect(caps.some((c) => c.visible === true)).to.equal(true);
            expect(caps.some((c) => c.visible === false)).to.equal(true);
          });
          cy.wait('@getCapabilitySets').then(({ response }) => {
            const sets = response.body.capabilitySets;
            expect(sets.some((s) => s.visible === true)).to.equal(true);
            expect(sets.some((s) => s.visible === false)).to.equal(true);
          });
          // only visible entities shown before toggling
          testData.visibleCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
          });
          testData.hiddenCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });
          testData.visibleCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(cap, false);
          });
          testData.hiddenCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxAbsent(cap);
          });

          // Step 4: Check "Show hidden capabilities" — all caps/sets shown, no new API calls
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });
          testData.hiddenCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
          });
          testData.hiddenCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(cap, false);
          });

          // Step 5: Select first visible capability set and first visible capability
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.visibleCapabilitySets[0]);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.visibleCapabilitySets[0]);
          AuthorizationRoles.selectCapabilityCheckbox(testData.visibleCapabilities[5]);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.visibleCapabilities[5]);

          // Step 6: Save & close — hidden entities absent in view; counters > 0
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: false });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('1');
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            (testData.firstSetVisibleCapabsCount + 1).toString(),
          );

          // Step 7: Edit — "Show hidden capabilities" unchecked; selected visible items shown
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyShowHiddenCapabilitiesCheckbox({
            isChecked: false,
            isDisabled: false,
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.visibleCapabilitySets[0]);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.visibleCapabilities[5]);
          // hidden still not visible
          testData.hiddenCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });
          testData.hiddenCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxAbsent(cap);
          });

          // Step 8: Unassign all — nothing selected
          AuthorizationRoles.clickUnassignAllCapabilitiesButton();
          AuthorizationRoles.verifyNoCapabilitiesOrSetsChecked();

          // Step 9: Show hidden — all shown; none selected
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });
          testData.hiddenCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set, false);
          });
          testData.hiddenCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(cap, false);
          });
          AuthorizationRoles.verifyNoCapabilitiesOrSetsChecked();

          // Step 10: Select first hidden capability set and first hidden capability; save
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.hiddenCapabilitySets[0]);
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.hiddenCapabilitySets[0]);
          AuthorizationRoles.selectCapabilityCheckbox(testData.hiddenCapabilities[0]);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.hiddenCapabilities[0]);
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
          // view pane: both accordions show 0 (hidden entities not displayed in view)
          AuthorizationRoles.checkCapabilitySetsAccordionCounter('0');
          AuthorizationRoles.checkCapabilitiesAccordionCounter('0');

          // Step 11: Edit — "Show hidden capabilities" unchecked; selected hidden items not shown
          AuthorizationRoles.openForEdit();
          AuthorizationRoles.verifyShowHiddenCapabilitiesCheckbox({
            isChecked: false,
            isDisabled: false,
          });
          testData.hiddenCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });
          testData.hiddenCapabilities.forEach((cap) => {
            AuthorizationRoles.verifyCapabilityCheckboxAbsent(cap);
          });

          // Step 12: Show hidden — first hidden selected items now visible and checked
          AuthorizationRoles.toggleShowHiddenCapabilities({ show: true });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.hiddenCapabilitySets[0]);
          AuthorizationRoles.verifyCapabilityCheckboxChecked(testData.hiddenCapabilities[0]);
        },
      );
    });
  });
});
