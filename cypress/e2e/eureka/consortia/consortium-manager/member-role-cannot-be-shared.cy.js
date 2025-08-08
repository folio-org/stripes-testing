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
    const roleName = `AT_C523604_RoleA_${randomPostfix}`;
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
    ];
    const capabilitySetsToAssignMember = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
    ];
    let userData;

    before('Create user, assign affiliations and capabilities, create role in Member', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabilitySetsToAssignMember);
          // Create the role in Member tenant
          cy.createAuthorizationRoleApi(roleName).then((role) => {
            userData.memberRoleId = role.id;
          });
        });
    });

    after('Delete user and role', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.setTenant(Affiliations.College);
      if (userData.memberRoleId) {
        cy.deleteAuthorizationRoleApi(userData.memberRoleId, true);
      }
    });

    it(
      'C523604 ECS | Eureka | Role created in member tenant can not be shared (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C523604'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        // Select Member tenant
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.searchRole(roleName);
        AuthorizationRoles.clickOnRoleName(roleName);
        AuthorizationRoles.clickActionsButton(roleName);
        AuthorizationRoles.checkShareToAllButtonShown(false);
      },
    );
  });
});
