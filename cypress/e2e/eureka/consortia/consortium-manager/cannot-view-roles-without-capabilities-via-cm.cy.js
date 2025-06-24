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
      centralRoleName: `AT_C503093_UserRole_Central_${randomPostfix}`,
      collegeRoleName: `AT_C503093_UserRole_College_${randomPostfix}`,
      universityRoleName: `AT_C503093_UserRole_University_${randomPostfix}`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'Settings Authorization-Roles Enabled',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let userData;

    before('Create user, data', () => {
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

    after('Delete user, data', () => {
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
      'C503093 ECS | Eureka | A user with not appropriate capabilities is not able to view authorization roles (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C503093'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManager.verifyMembersSelected(3);
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        AuthorizationRoles.waitLoading();
        AuthorizationRoles.closeAllCalloutsIfShown();
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.waitLoading();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.waitLoading();

        ConsortiumManager.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, false);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.waitLoading();
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.waitLoading();
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.verifyAccessErrorShown();
        AuthorizationRoles.waitLoading();
      },
    );
  });
});
