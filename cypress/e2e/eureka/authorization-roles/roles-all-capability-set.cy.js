import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import Capabilities from '../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        roleName: `AT_C605891_UserRole_${randomPostfix}`,
        roleDescription: `Description C605891 ${randomPostfix}`,
        updatedRoleName: `AT_C605891_UserRole_${randomPostfix} UPD`,
        updatedRoleDescription: `Description C605891 ${randomPostfix} UPD`,
        newRoleName: `AT_C605891_UserRole_2_${randomPostfix}`,
        newRoleDescription: `Description C605891 ${randomPostfix} 2`,
        updatedNewRoleName: `AT_C605891_UserRole_2_${randomPostfix} UPD`,
        updatedNewRoleDescription: `Description C605891 ${randomPostfix} 2 UPD`,
        originalCapabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
        ],
        originalCapabilitiesInSets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Collection',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Item',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Item',
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Item',
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships Item',
            action: CAPABILITY_ACTIONS.DELETE,
          },
        ],
        capabSetIds: [],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsView,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsDelete,
      ];

      const capabsToAssign = [Capabilities.settingsEnabled];

      before('Create role, user', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            capabsToAssign,
            capabSetsToAssign,
          );
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);
          cy.createAuthorizationRoleApi(testData.roleName, testData.roleDescription).then(
            (role) => {
              testData.roleId = role.id;
              testData.originalCapabilitySets.forEach((capabilitySet) => {
                capabilitySet.type = capabilitySet.table;
                cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
                  testData.capabSetIds.push(capabSetId);
                });
              });
            },
          );
        });
      });

      before('Assign capabilities, login', () => {
        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });

      after('Delete user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
        cy.deleteAuthorizationRoleApi(testData.newRoleId, true);
      });

      it(
        'C605891 User with all capability sets for roles can view/edit/create/delete authorization roles',
        { tags: ['criticalPath', 'eureka', 'C605891'] },
        () => {
          AuthorizationRoles.checkNewButtonShown();
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter(
            `${testData.originalCapabilitySets.length}`,
          );
          AuthorizationRoles.checkCapabilitiesAccordionCounter(
            `${testData.originalCapabilitiesInSets.length}`,
          );
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.originalCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.checkActionsOptionsAvailable();

          AuthorizationRoles.openForEdit();
          testData.originalCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          testData.originalCapabilitiesInSets.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxCheckedAndDisabled(capability);
          });
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedRoleName,
            testData.updatedRoleDescription,
          );
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedRoleName,
            testData.updatedRoleDescription,
          );

          AuthorizationRoles.clickDeleteRole();
          AuthorizationRoles.confirmDeleteRole(testData.updatedRoleName);

          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(
            testData.newRoleName,
            testData.newRoleDescription,
          );
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(testData.newRoleName, testData.newRoleDescription);

          AuthorizationRoles.openForEdit();
          AuthorizationRoles.fillRoleNameDescription(
            testData.updatedNewRoleName,
            testData.updatedNewRoleDescription,
          );
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveEdit(
            testData.updatedNewRoleName,
            testData.updatedNewRoleDescription,
          );
          cy.getUserRoleIdByNameApi(testData.updatedNewRoleName).then((roleId) => {
            testData.newRoleId = roleId;

            AuthorizationRoles.clickDeleteRole();
            AuthorizationRoles.confirmDeleteRole(testData.updatedNewRoleName);
          });
        },
      );
    });
  });
});
