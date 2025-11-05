import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const centralRoleName = `AT_C523665_CentralRole_${randomPostfix}`;
    const memberRoleName = `AT_C523665_MemberRole_${randomPostfix}`;
    const preparedMemberRoleName = `AT_C523665_MemberRoleAPI_${randomPostfix}`;
    const capabSetsToAssignCentral = [
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiAuthorizationRolesSettingsCreate,
      CapabilitySets.uiAuthorizationRolesSettingsDelete,
    ];
    const capabSetsToAssignMember = [CapabilitySets.uiAuthorizationRolesSettingsDelete];
    let userData;
    let memberRoleId;

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMember);
          // Create a non-centrally managed role in Member via API
          cy.createAuthorizationRoleApi(preparedMemberRoleName).then((role) => {
            memberRoleId = role.id;
          });
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.getUserRoleIdByNameApi(centralRoleName).then((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId, true);
      });
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(memberRoleId, true);
      cy.getUserRoleIdByNameApi(memberRoleName).then((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId, true);
      });
    });

    it(
      'C523665 ECS | Eureka | User can create authorization role through Consortium manager only in tenant where user has appropriate capabilities (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C523665'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitContentLoading(true);
        // Step 2-3: Select all affiliated tenants
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);
        // Step 5: Central tenant
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        ConsortiumManagerApp.verifySelectMembersButton(false);
        AuthorizationRoles.fillRoleNameDescription(centralRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveCreate(centralRoleName);

        // Step 9: Member tenant
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.clickActionsButton();
        AuthorizationRoles.clickNewButton();
        ConsortiumManagerApp.verifySelectMembersButton(false);
        AuthorizationRoles.fillRoleNameDescription(memberRoleName);
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.verifyCreateAccessError();
        AuthorizationRoles.closeRoleCreateView();
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(memberRoleName);
        AuthorizationRoles.checkRoleFound(memberRoleName, false);
        // Step 14: Select a non-centrally managed role (created via API)
        AuthorizationRoles.searchRole(preparedMemberRoleName);
        AuthorizationRoles.clickOnRoleName(preparedMemberRoleName);
        AuthorizationRoles.checkActionsOptionsAvailable(false, true, true, preparedMemberRoleName);
        AuthorizationRoles.clickDeleteRole(preparedMemberRoleName);
        AuthorizationRoles.confirmDeleteRole(preparedMemberRoleName);
      },
    );
  });
});
