import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import Capabilities from '../../../../support/dictionary/capabilities';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const roleName = `AT_C722382_UserRole_${randomPostfix}`;

    const roleCapabilitySets = [
      {
        table: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      { table: CAPABILITY_TYPES.DATA, resource: 'UI-Users', action: CAPABILITY_ACTIONS.EDIT },
      {
        table: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Users Settings Addresstypes',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
    ];

    const roleCapabilitySetsMember = roleCapabilitySets.slice(1);

    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
    ];

    const capabSetsToAssignMember = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];

    const capabsToAssignMember = [Capabilities.settingsEnabled];

    const capabSetIds = [];
    let userData;
    let roleId;

    before('Create user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.then(() => {
        roleCapabilitySets.forEach((capabilitySet) => {
          capabilitySet.type = capabilitySet.table;
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIds.push(capabSetId);
          });
        });
      }).then(() => {
        // Create role in Central via API
        cy.createAuthorizationRoleApi(roleName).then((role) => {
          roleId = role.id;
          cy.addCapabilitySetsToNewRoleApi(roleId, capabSetIds);
          // Create user and assign affiliations
          cy.createTempUser([]).then((userProperties) => {
            userData = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, userData.userId);
            cy.assignAffiliationToUser(Affiliations.University, userData.userId);
            // Assign required capabilities to user in Central
            cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
            // Assign required capabilities to user in College and University
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(
              userData.userId,
              capabsToAssignMember,
              capabSetsToAssignMember,
            );
            cy.setTenant(Affiliations.University);
            cy.wait(10_000);
            cy.assignCapabilitiesToExistingUser(
              userData.userId,
              capabsToAssignMember,
              capabSetsToAssignMember,
            );
            cy.resetTenant();
          });
        });
      });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.deleteSharedRoleApi({ id: roleId, name: roleName }, true);
      cy.deleteAuthorizationRoleApi(roleId, true);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C722382 ECS | Eureka | Share authorization role when not all capability sets exist in member tenants (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C722382'] },
      () => {
        // Log in as the user in Central
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();

        // Step 2: Select all affiliated tenants
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();

        // Steps 4, 5: Share the role to all
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.checkRoleCentrallyManaged(roleName, false);
        cy.wait(5000);
        AuthorizationRoles.shareRole(roleName);
        AuthorizationRoles.verifyRoleViewPane(roleName);
        AuthorizationRoles.closeRoleDetailView(roleName);

        // Step 6: Verify capability sets in College
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${roleCapabilitySetsMember.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilitySetsMember.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
        AuthorizationRoles.closeRoleDetailView(roleName);

        // Step 7: Verify capability sets in University
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${roleCapabilitySetsMember.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilitySetsMember.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });

        // Steps 8, 9: Switch active affiliation to College and verify in Settings
        cy.waitForAuthRefresh(() => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.reload();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        }, 20_000);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${roleCapabilitySetsMember.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilitySetsMember.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });

        // Steps 10, 11: Switch active affiliation to University and verify in Settings
        ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.checkCapabilitySetsAccordionCounter(
          `${roleCapabilitySetsMember.length}`,
        );
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        roleCapabilitySetsMember.forEach((set) => {
          AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
        });
      },
    );
  });
});
