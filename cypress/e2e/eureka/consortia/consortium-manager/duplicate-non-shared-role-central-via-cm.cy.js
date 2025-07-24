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
import { including } from '../../../../../interactors';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const originalRoleName = `AT_C552361_UserRole_${randomPostfix}`;
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
        action: CAPABILITY_ACTIONS.EDIT,
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
    const capabsToAssignCentral = [
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
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssignCentral,
            capabSetsToAssignCentral,
          );
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
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

                cy.setTenant(Affiliations.College);
                cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMember);
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
      cy.getUserRoleIdByNameApi(`${duplicateRoleNamePart}*`).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
    });

    it(
      'C552361 ECS | Eureka | Duplicate non-shared role for Central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552361'] },
      () => {
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(userData.username, userData.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          cy.reload();
          ConsortiumManagerApp.waitLoading();
        }, 20_000);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(2);
        AuthorizationRoles.waitContentLoading(true);
        // Central tenant
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(originalRoleName);
        AuthorizationRoles.checkRoleFound(originalRoleName);
        AuthorizationRoles.clickOnRoleName(originalRoleName);
        AuthorizationRoles.clickActionsButton(originalRoleName);
        AuthorizationRoles.checkDuplicateOptionShown();
        AuthorizationRoles.clickDuplicateButton();
        AuthorizationRoles.cancelDuplicateRole();
        AuthorizationRoles.duplicateRole(originalRoleName);
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        // Step 9-10: Verify original role is unchanged
        AuthorizationRoles.searchRole(originalRoleName);
        AuthorizationRoles.checkRoleFound(originalRoleName);
        AuthorizationRoles.clickOnRoleName(originalRoleName, false);
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(assignedUser.lastName, assignedUser.firstName);
        // Steps 11-12: Member tenant should not have the duplicate
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(duplicateRoleNamePart, false);
        // Step 13-15: Go to Settings > Authorization roles, verify duplicate
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
