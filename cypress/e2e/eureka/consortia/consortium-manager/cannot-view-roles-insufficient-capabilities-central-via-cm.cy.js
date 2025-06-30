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
    const testData = {
      centralRoleName: `AT_C552490_UserRole_Central_${randomPostfix}`,
      collegeRoleName: `AT_C552490_UserRole_College_${randomPostfix}`,
      universityRoleName: `AT_C552490_UserRole_University_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
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
    const capabsToAssign = [{ type: 'Settings', resource: 'Settings Enabled', action: 'View' }];
    let userData;

    before('Create user, roles, and affiliations', () => {
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
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            testData.roleCentralId = roleCentral.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignMember,
          );
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleMember) => {
            testData.roleCollegeId = roleMember.id;
          });
          cy.setTenant(Affiliations.University);
          cy.wait(10_000);
          cy.assignCapabilitiesToExistingUser(
            userData.userId,
            capabsToAssign,
            capabSetsToAssignMember,
          );
          cy.createAuthorizationRoleApi(testData.universityRoleName).then((roleMember) => {
            testData.roleUniversityId = roleMember.id;
          });
        });
    });

    after('Delete user and roles', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.deleteAuthorizationRoleApi(testData.roleCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationRoleApi(testData.roleCollegeId);
      cy.setTenant(Affiliations.University);
      cy.deleteAuthorizationRoleApi(testData.roleUniversityId);
    });

    it(
      'C552490 ECS | Eureka | User with insufficient capability sets for Central tenant is not able to view authorization roles associated to that tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552490'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(3);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        // workaround due to the fact that by default a member which is first in the list (alphabetically) is selected
        // usually, it's either Central (Consortium) or College, depending on the tenant names on current environment
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.checkRoleFound(testData.universityRoleName);
        // Step 3: Try to view Central tenant roles
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.verifyRolesCount(0);
        // Step 4: Open member dropdown and verify only selected tenants are present
        // (Dropdown is opened as part of selectMember, so just check options)
        ConsortiumManagerApp.verifyTenantsInDropdown([
          tenantNames.central,
          tenantNames.college,
          tenantNames.university,
        ]);
        // Step 5: Select Member tenant and verify roles are shown
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading(true);
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName);
        AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
        AuthorizationRoles.checkRoleFound(testData.universityRoleName, false);
      },
    );
  });
});
