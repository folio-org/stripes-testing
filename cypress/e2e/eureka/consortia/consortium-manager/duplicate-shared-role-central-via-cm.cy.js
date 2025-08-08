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
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

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

    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
    ];
    const capabSetsToAssignMember = [CapabilitySets.uiAuthorizationRolesSettingsAdmin];
    const capabsToAssignMember = [Capabilities.settingsEnabled];
    const assignUserCentral = {};
    const assignUserCollege = {};

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
          cy.createTempUser([]).then((assignUserProperties) => {
            Object.assign(assignUserCentral, assignUserProperties);
          });
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((assignUserProperties) => {
            Object.assign(assignUserCollege, assignUserProperties);
          });
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssignMember,
            capabSetsToAssignMember,
          );
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

    before('Assign users', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.addRolesToNewUserApi(assignUserCentral.userId, [sharedRoleId]);
      cy.setTenant(Affiliations.College);
      cy.getUserRoleIdByNameApi(sharedRoleName).then((roleId) => {
        cy.addRolesToNewUserApi(assignUserCollege.userId, [roleId]);
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      Users.deleteViaApi(assignUserCentral.userId);
      if (sharedRoleId) {
        cy.deleteSharedRoleApi({ id: sharedRoleId, name: sharedRoleName }, true);
      }
      cy.getUserRoleIdByNameApi(`${duplicateRoleNamePart}*`).then((roleId) => {
        if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
      });
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollege.userId);
    });

    it(
      'C552454 ECS | Duplicate shared authorization role in central tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552454'] },
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
        AuthorizationRoles.waitContentLoading(true);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName);
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, false, sharedRoleName);
        AuthorizationRoles.duplicateRole(sharedRoleName);
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName, false);
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCentral.lastName,
          assignUserCentral.firstName,
          true,
        );
        AuthorizationRoles.closeRoleDetailView(sharedRoleName);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicateRoleNamePart), false);

        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(duplicateRoleNamePart);
        AuthorizationRoles.checkRoleFound(including(duplicateRoleNamePart), false);
        AuthorizationRoles.searchRole(sharedRoleName);
        AuthorizationRoles.checkRoleFound(sharedRoleName);
        AuthorizationRoles.clickOnRoleName(sharedRoleName);
        AuthorizationRoles.clickOnCapabilitiesAccordion();
        roleCapabilities.forEach((capab) => {
          AuthorizationRoles.verifyCapabilityCheckboxChecked(capab);
        });
        AuthorizationRoles.checkUsersAccordion(1);
        AuthorizationRoles.verifyAssignedUser(
          assignUserCollege.lastName,
          assignUserCollege.firstName,
          true,
        );
      },
    );
  });
});
