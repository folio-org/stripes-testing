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
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const originalRoleName = `AT_C850011_UserRole_${randomPostfix}`;
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
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
      CapabilitySets.consortiaSharingRolesAllItemDelete,
      CapabilitySets.capabilities,
      CapabilitySets.roleCapabilitySets,
    ];
    const capabSetsToAssignMember = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.capabilities,
      CapabilitySets.roleCapabilitySets,
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
          cy.createTempUser([]).then((assignedUserProps) => {
            assignedUser = assignedUserProps;
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
                cy.addCapabilitiesToNewRoleApi(originalRoleId, roleCapabIds);
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
      cy.deleteAuthorizationRoleApi(originalRoleId, true);
    });

    it(
      'C850011 ECS | Duplicated authorization role can be shared and deleted (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C850011'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(2);
        AuthorizationRoles.waitContentLoading(true);

        // Duplicate role
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(originalRoleName);
        AuthorizationRoles.clickOnRoleName(originalRoleName);
        AuthorizationRoles.duplicateRole(originalRoleName);
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });

        // Wait for capabilities assignments to be duplicated
        cy.wait(5000);

        // Share duplicated role
        AuthorizationRoles.shareRole(including(duplicateRoleNamePart));
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });

        // Check duplicated role on Member tenant
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.clickOnRoleName(including(duplicateRoleNamePart));
        AuthorizationRoles.checkRoleCentrallyManaged(including(duplicateRoleNamePart));
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.verifyAssignedUsersAccordionEmpty();

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.clickOnRoleName(including(duplicateRoleNamePart));
        AuthorizationRoles.checkRoleCentrallyManaged(including(duplicateRoleNamePart));

        AuthorizationRoles.clickDeleteRole(including(duplicateRoleNamePart));
        AuthorizationRoles.confirmDeleteRole(including(duplicateRoleNamePart));

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicateRoleNamePart), false);
      },
    );
  });
});
