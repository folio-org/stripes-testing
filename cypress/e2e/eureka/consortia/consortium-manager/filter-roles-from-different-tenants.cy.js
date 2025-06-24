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
      centralRoleName: `AT_C503005_UserRole_${randomPostfix} CentralOne`,
      centralRoleName2: `AT_C503005_UserRole_${randomPostfix} CentralTwo`,
      collegeRoleName: `AT_C503005_UserRole_${randomPostfix} CollegeOne`,
      collegeRoleName2: `AT_C503005_UserRole_${randomPostfix} CollegeTwo`,
      queryPostfix: '#$%',
      queryPrefix: '#$%*',
      queryMiddlePart: '$%*&^',
    };
    const searchQueriesCentral = {
      exact: testData.centralRoleName,
      incomplete: testData.centralRoleName.slice(0, -3),
      nonExact1: testData.centralRoleName + testData.queryPostfix,
      nonExact2: testData.queryPrefix + testData.centralRoleName,
      nonExact3: testData.centralRoleName
        .split(' ')
        .toSpliced(testData.centralRoleName.split(' ').length - 1, 0, testData.queryMiddlePart)
        .join(' '),
    };
    const searchQueriesCollege = {
      exact: testData.collegeRoleName,
      incomplete: testData.collegeRoleName.slice(0, -3),
      nonExact1: testData.collegeRoleName + testData.queryPostfix,
      nonExact2: testData.queryPrefix + testData.collegeRoleName,
      nonExact3: testData.collegeRoleName
        .split(' ')
        .toSpliced(testData.collegeRoleName.split(' ').length - 1, 0, testData.queryMiddlePart)
        .join(' '),
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
    const capabSetsToAssignCollege = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const roleCentralIds = [];
    const roleCollegeIds = [];
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
          cy.createAuthorizationRoleApi(testData.centralRoleName).then((roleCentral) => {
            roleCentralIds.push(roleCentral.id);
          });
          cy.createAuthorizationRoleApi(testData.centralRoleName2).then((roleCentral2) => {
            roleCentralIds.push(roleCentral2.id);
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCollege);
          cy.createAuthorizationRoleApi(testData.collegeRoleName).then((roleCollege) => {
            roleCollegeIds.push(roleCollege.id);
          });
          cy.createAuthorizationRoleApi(testData.collegeRoleName2).then((roleCollege2) => {
            roleCollegeIds.push(roleCollege2.id);
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      roleCentralIds.forEach((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId);
      });
      cy.setTenant(Affiliations.College);
      roleCollegeIds.forEach((roleId) => {
        cy.deleteAuthorizationRoleApi(roleId);
      });
    });

    it(
      'C503005 ECS | Eureka | User is able to filter Authorization roles in Consortium manager from different tenants (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C503005'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(1);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.checkRoleFound(testData.centralRoleName);
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName, false);
        AuthorizationRoles.searchRole(searchQueriesCentral.exact);
        AuthorizationRoles.verifyRolesCount(1);
        AuthorizationRoles.checkRoleFound(testData.centralRoleName);
        AuthorizationRoles.searchRole(searchQueriesCentral.incomplete);
        AuthorizationRoles.verifyRolesCount(2);
        AuthorizationRoles.checkRoleFound(testData.centralRoleName);
        AuthorizationRoles.checkRoleFound(testData.centralRoleName2);
        [
          searchQueriesCentral.nonExact1,
          searchQueriesCentral.nonExact2,
          searchQueriesCentral.nonExact3,
        ].forEach((searchQuery) => {
          AuthorizationRoles.searchRole(searchQuery);
          AuthorizationRoles.verifyRolesCount(0);
        });
        AuthorizationRoles.searchRole(testData.collegeRoleName);
        AuthorizationRoles.verifyRolesCount(0);

        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName);
        AuthorizationRoles.checkRoleFound(testData.centralRoleName, false);
        AuthorizationRoles.searchRole(searchQueriesCollege.exact);
        AuthorizationRoles.verifyRolesCount(1);
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName);
        AuthorizationRoles.searchRole(searchQueriesCollege.incomplete);
        AuthorizationRoles.verifyRolesCount(2);
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName);
        AuthorizationRoles.checkRoleFound(testData.collegeRoleName2);
        [
          searchQueriesCollege.nonExact1,
          searchQueriesCollege.nonExact2,
          searchQueriesCollege.nonExact3,
        ].forEach((searchQuery) => {
          AuthorizationRoles.searchRole(searchQuery);
          AuthorizationRoles.verifyRolesCount(0);
        });
        AuthorizationRoles.searchRole(testData.centralRoleName);
        AuthorizationRoles.verifyRolesCount(0);
      },
    );
  });
});
