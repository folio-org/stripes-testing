import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
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
      centralRoleName: `C422010 Autotest Role Central ${randomPostfix}`,
      collegeRoleName: `C422010 Autotest Role College ${randomPostfix}`,
      universityRoleName: `C422010 Autotest Role University ${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let userData;
    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            testData.roleCentralId = roleCentral.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleCollege) => {
            testData.roleCollegeId = roleCollege.id;
          });
          cy.setTenant(Affiliations.University);
          cy.wait(10000);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.createAuthorizationRoleApi(testData.universityRoleName).then((roleUniversity) => {
            testData.roleUniversityId = roleUniversity.id;
          });
        });
    });

    after('Delete users data', () => {
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
      'C422010 ECS | Eureka | A user with appropriate role can view authorization roles from different tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C422010'] },
      () => {
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        ConsortiumManager.clickSelectMembers();
        SelectMembers.verifyAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
        );
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, false);
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManager.verifyMembersSelected(1);
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        SelectMembers.selectMember(tenantNames.central);
        cy.resetTenant();
        cy.getAuthorizationRoles().then((rolesCentral) => {
          AuthorizationRoles.verifyRolesCount(rolesCentral.length);
          AuthorizationRoles.checkRoleFound(testData.centralRoleName);
          AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);
          AuthorizationRoles.checkRoleFound(testData.universityRoleName, false);

          SelectMembers.selectAllMembers();
          ConsortiumManager.verifyMembersSelected(3);
          SelectMembers.selectMember(tenantNames.college);
          cy.setTenant(Affiliations.College);
          cy.getAuthorizationRoles().then((rolesCollege) => {
            AuthorizationRoles.verifyRolesCount(rolesCollege.length);
            AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
            AuthorizationRoles.checkRoleFound(testData.collegeRoleName);
            AuthorizationRoles.checkRoleFound(testData.universityRoleName, false);

            SelectMembers.selectMember(tenantNames.university);
            cy.setTenant(Affiliations.University);
            cy.getAuthorizationRoles().then((rolesUniversity) => {
              AuthorizationRoles.verifyRolesCount(rolesUniversity.length);
              AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
              AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);
              AuthorizationRoles.checkRoleFound(testData.universityRoleName);
            });
          });
        });
      },
    );
  });
});
