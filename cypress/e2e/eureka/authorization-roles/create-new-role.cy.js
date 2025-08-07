import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C423998_UserRole_${getRandomPostfix()}`,
        roleDescription: `Description C423998 ${getRandomPostfix()}`,
        applicationName: 'app-platform-minimal',
        capabilitySet: {
          table: CAPABILITY_TYPES.DATA,
          resource: 'Note Types',
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        capabilitiesInSet: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Note Types Item',
            action: CAPABILITY_ACTIONS.DELETE,
          },
        ],
        capabilitiesToSelect: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Addresstypes Item',
            action: CAPABILITY_ACTIONS.DELETE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Addresstypes Item',
            action: CAPABILITY_ACTIONS.EDIT,
          },
        ],
        expectedRowCounts: {
          capabilities: {
            Data: 4,
          },
          capabilitySets: {
            Data: 1,
          },
        },
        absentCapabilitySetTables: [CAPABILITY_TYPES.SETTINGS, CAPABILITY_TYPES.PROCEDURAL],
        absentCapabilityTables: [CAPABILITY_TYPES.SETTINGS, CAPABILITY_TYPES.PROCEDURAL],
      };

      const capabSetsToAssign = [CapabilitySets.uiAuthorizationRolesSettingsCreate];

      before('Creating user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
        });
      });

      after('Deleting user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteCapabilitiesFromRoleApi(testData.roleId);
        cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
        cy.deleteAuthorizationRoleApi(testData.roleId);
      });

      it(
        'C423998 Creating new authorization role (eureka)',
        { tags: ['criticalPath', 'eureka', 'eurekaPhase1', 'C423998'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName, testData.roleDescription);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          AuthorizationRoles.selectCapabilitySetCheckbox(testData.capabilitySet);
          testData.capabilitiesToSelect.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet);
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          cy.intercept('POST', '/roles*').as('rolesCall');
          cy.intercept('POST', '/roles/capabilities*').as('capabilitiesCall');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();
          cy.wait('@rolesCall').then((call) => {
            const roleId = call.response.body.id;
            testData.roleId = roleId;
            expect(call.request.body.name).to.eq(testData.roleName);
            expect(call.request.body.description).to.eq(testData.roleDescription);
            cy.wait('@capabilitiesCall').then((callCapabs) => {
              expect(callCapabs.request.body.capabilityIds).to.have.lengthOf(2);
              expect(callCapabs.request.body.roleId).to.eq(roleId);
            });
            cy.wait('@capabilitySetsCall').then((callCapabSets) => {
              expect(callCapabSets.request.body.capabilitySetIds).to.have.lengthOf(1);
              expect(callCapabSets.request.body.roleId).to.eq(roleId);
            });
          });
          cy.wait(4000);
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName, testData.roleDescription);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(testData.capabilitySet);
          AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(testData.capabilitySet, false);
          Object.entries(testData.expectedRowCounts.capabilitySets).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilitySetRows(table, count);
          });
          testData.absentCapabilitySetTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
          });
          AuthorizationRoles.verifyCheckboxesCountInCapabilitySetRow(testData.capabilitySet, 1);
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilitiesInSet.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          testData.capabilitiesToSelect.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          Object.entries(testData.expectedRowCounts.capabilities).forEach(([table, count]) => {
            AuthorizationRoles.checkCountOfCapabilityRows(table, count);
          });
          testData.absentCapabilityTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilityTableAbsent(table);
          });
          // Verify multiple checkboxes checked in certain rows for different actions
          AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(testData.capabilitiesInSet[2], 4);
          AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(
            testData.capabilitiesToSelect[0],
            2,
          );
        },
      );
    });
  });
});
