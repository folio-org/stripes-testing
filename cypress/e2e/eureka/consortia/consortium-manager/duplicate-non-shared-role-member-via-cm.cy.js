import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
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
    const originalRoleName = `AT_C552362_UserRole_${randomPostfix}`;
    const duplicateRoleNamePart = `${originalRoleName} (duplicate)`;
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
    let assignedUser;
    let userData;
    let originalRoleId;
    const roleCapabIds = [];

    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMember = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabsToAssignMember = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssignMember,
            capabSetsToAssignMember,
          );
          // Create a user to assign to the role
          cy.createTempUser([]).then((assignedUserProps) => {
            assignedUser = assignedUserProps;
            // Create the original role
            cy.createAuthorizationRoleApi(originalRoleName).then((role) => {
              originalRoleId = role.id;
              cy.then(() => {
                roleCapabilities.forEach((capability) => {
                  capability.type = capability.table;
                  cy.getCapabilityIdViaApi(capability).then((capabId) => {
                    roleCapabIds.push(capabId);
                  });
                });
              }).then(() => {
                // Assign capabilities to the role
                cy.addCapabilitiesToNewRoleApi(originalRoleId, roleCapabIds);
                // Assign user to the role
                cy.addRolesToNewUserApi(assignedUser.userId, [originalRoleId]);
              });
            });
          });
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      if (assignedUser) {
        Users.deleteViaApi(assignedUser.userId);
      }
      cy.setTenant(Affiliations.College);
      if (originalRoleId) {
        cy.deleteAuthorizationRoleApi(originalRoleId, true);
      }
      cy.getUserRoleIdByNameApi(`${duplicateRoleNamePart}*`).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
    });

    it(
      'C552362 ECS | Eureka | Duplicate non-shared role for Member tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552362'] },
      () => {
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(userData.username, userData.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          cy.reload();
          ConsortiumManagerApp.waitLoading();
        }, 20_000);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(2);
        AuthorizationRoles.waitContentLoading(true);
        // Member tenant
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(originalRoleName);
        AuthorizationRoles.checkRoleFound(originalRoleName);
        AuthorizationRoles.clickOnRoleName(originalRoleName);
        AuthorizationRoles.duplicateRole(originalRoleName);
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        // Step 7-8: Verify original role is unchanged
        AuthorizationRoles.searchRole(originalRoleName);
        AuthorizationRoles.checkRoleFound(originalRoleName);
        AuthorizationRoles.clickOnRoleName(originalRoleName, false);
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(assignedUser.lastName, assignedUser.firstName);
        // Step 9: Central tenant should not have the duplicate
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(duplicateRoleNamePart, false);
        // Step 10-12: Switch active affiliation to Member, go to Settings > Authorization roles, verify duplicate
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.clickOnRoleName(including(duplicateRoleNamePart));
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();
      },
    );
  });
});
