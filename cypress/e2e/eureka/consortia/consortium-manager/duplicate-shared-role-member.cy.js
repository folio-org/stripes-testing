import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { including } from '../../../../../interactors';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const sharedRoleName = `AT_C552454_SharedRole_${randomPostfix}`;
    const duplicateRoleNamePart = `${sharedRoleName} (duplicate)`;
    const roleCapabilities = [
      {
        table: CAPABILITY_TYPES.DATA,
        resource: 'Capabilities',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
      {
        table: CAPABILITY_TYPES.DATA,
        resource: 'Role-Capability-Sets',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
    ];
    let userData;
    let sharedRoleId;
    const roleCapabIds = [];

    const capabSetsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
          cy.setTenant(Affiliations.University);
          cy.wait(10_000);
          cy.assignCapabilitiesToExistingUser(userData.userId, capabsToAssign, capabSetsToAssign);
          cy.resetTenant();
          // Create the shared role in Central
          cy.createAuthorizationRoleApi(sharedRoleName).then((role) => {
            sharedRoleId = role.id;
            cy.then(() => {
              roleCapabilities.forEach((capability) => {
                capability.type = capability.table;
                cy.getCapabilityIdViaApi(capability).then((capabId) => {
                  roleCapabIds.push(capabId);
                });
              });
            }).then(() => {
              cy.addCapabilitiesToNewRoleApi(sharedRoleId, roleCapabIds).then(() => {
                cy.shareRoleWithCapabilitiesApi({ id: sharedRoleId, name: sharedRoleName });
              });
            });
          });
        });
    });

    after('Delete user and roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      if (sharedRoleId) {
        cy.deleteSharedRoleApi({ id: sharedRoleId, name: sharedRoleName }, true);
      }
      cy.getUserRoleIdByNameApi(`${duplicateRoleNamePart}*`).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
      cy.setTenant(Affiliations.College);
      cy.getUserRoleIdByNameApi(`${duplicateRoleNamePart}*`).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
    });

    it(
      'C552454 ECS | Duplicate shared authorization role in central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552454'] },
      () => {
        // Step 1: Member 1 (College)
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(userData.username, userData.password);
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            SETTINGS_SUBSECTION_AUTH_ROLES,
          );
          AuthorizationRoles.waitContentLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.reload();
          AuthorizationRoles.waitContentLoading();
        }, 20_000);
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName);
        // Step 3: Duplicate option present, Edit/Delete not present
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, false, sharedRoleName);
        // Step 4-5: Duplicate the role
        AuthorizationRoles.duplicateRole(sharedRoleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        // Step 6: Edit/Duplicate/Delete present for duplicate
        AuthorizationRoles.checkActionsOptionsAvailable(
          true,
          true,
          true,
          including(duplicateRoleNamePart),
        );
        // Step 7-9: Duplicate again, verify both duplicates, original unchanged
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName, false);
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, false, sharedRoleName);
        AuthorizationRoles.duplicateRole(sharedRoleName);
        // AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        // Step 10-14: Switch to Member 2, verify duplicates not present, original is
        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicateRoleNamePart), false);
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName);
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, false, sharedRoleName);
        // Step 15-19: Switch to Central, verify duplicates not present, original is
        ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicateRoleNamePart), false);
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName);
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, false, sharedRoleName);
      },
    );
  });
});
