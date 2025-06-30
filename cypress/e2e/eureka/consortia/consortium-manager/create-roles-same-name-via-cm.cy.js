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

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const roleName = `AT_C523596_RoleA_${randomPostfix}`;
    const updatedRoleName = `AT_C523596_RoleB_${randomPostfix}`;
    const applicationName = 'app-platform-minimal';
    const capabilitySetsForRole = [
      {
        table: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        table: CAPABILITY_TYPES.DATA,
        resource: 'Capabilities',
        action: CAPABILITY_ACTIONS.MANAGE,
      },
    ];
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
    const capabsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let userData;

    before('Create user, assign affiliations and capabilities', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignCentral,
          );
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignMember,
          );
          cy.setTenant(Affiliations.University);
          cy.wait(10_000);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignMember,
          );
        });
    });

    after('Delete user and roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      // Clean up roles in all tenants
      [Affiliations.College, Affiliations.University].forEach((tenant) => {
        cy.setTenant(tenant);
        cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
          if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
        });
        cy.getUserRoleIdByNameApi(updatedRoleName).then((roleId) => {
          if (roleId) cy.deleteAuthorizationRoleApi(roleId, true);
        });
      });
    });

    it(
      'C523596 ECS | Eureka | Create authorization roles with same names for member tenants and edit only one of them (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C523596'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        // Step 2-3: Select all affiliated tenants
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([
          tenantNames.central,
          tenantNames.college,
          tenantNames.university,
        ]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(3);
        // Step 4: Open member dropdown and verify tenants
        ConsortiumManagerApp.verifyTenantsInDropdown([
          tenantNames.central,
          tenantNames.college,
          tenantNames.university,
        ]);
        // Step 5: Select Member 1 (College)
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        // Step 6: Create role in Member 1
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        ConsortiumManagerApp.verifySelectMembersButton(false);
        AuthorizationRoles.fillRoleNameDescription(roleName);
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectApplicationInModal(applicationName);
        AuthorizationRoles.clickSaveInModal();
        capabilitySetsForRole.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(roleName);
        AuthorizationRoles.verifyRoleViewPane(roleName);
        AuthorizationRoles.checkRoleFound(roleName);
        // Step 8: Select Central tenant and verify role is not present
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.checkRoleFound(roleName, false);
        // Step 10: Select Member 2 (University) and verify role is not present
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.checkRoleFound(roleName, false);
        // Step 12: Create role in Member 2 with same name
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        ConsortiumManagerApp.verifySelectMembersButton(false);
        AuthorizationRoles.fillRoleNameDescription(roleName);
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectApplicationInModal(applicationName);
        AuthorizationRoles.clickSaveInModal();
        capabilitySetsForRole.forEach((set) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(set);
        });
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(roleName);
        AuthorizationRoles.verifyRoleViewPane(roleName);
        AuthorizationRoles.checkRoleFound(roleName);
        // Step 14: Switch back to Member 1 (College)
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.checkRoleFound(roleName);
        AuthorizationRoles.verifyRolesCount(1);
        // Step 16: Click on the role and edit it
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.openForEdit(roleName);
        AuthorizationRoles.fillRoleNameDescription(updatedRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(updatedRoleName);
        AuthorizationRoles.searchRole(updatedRoleName);
        AuthorizationRoles.checkRoleFound(updatedRoleName);
        // Step 19: Switch to Member 2 (University) and verify updated name is not present
        SelectMembers.selectMember(tenantNames.university);
        // Step 16: Click on the role and edit it
        AuthorizationRoles.searchRole('');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(updatedRoleName);
        AuthorizationRoles.checkRoleFound(updatedRoleName, false);
        // Step 21: Search for original name in Member 2
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.checkRoleFound(roleName);
      },
    );
  });
});
