import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import UserEdit from '../../../../support/fragments/users/userEdit';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleNameA: `AT_C514916_UserRole_CA_${randomPostfix}`,
        centralRoleNameB: `AT_C514916_UserRole_CB_${randomPostfix}`,
        collegeRoleNameA: `AT_C514916_UserRole_M1A_${randomPostfix}`,
        collegeRoleNameB: `AT_C514916_UserRole_M1B_${randomPostfix}`,
        universityRoleNameA: `AT_C514916_UserRole_M2A_${randomPostfix}`,
        universityRoleNameB: `AT_C514916_UserRole_M2B_${randomPostfix}`,
      };

      const capabSetsToAssign = [CapabilitySets.uiUsersRolesManage];

      const capabsToAssign = [Capabilities.consortiaUserTenantsCollection];

      const testUser = {};
      const assignUser = {};
      const centralRoleIds = [];
      const collegeRoleIds = [];
      const universityRoleIds = [];

      before('Create users, roles', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((tempUserProperties) => {
          Object.assign(testUser, tempUserProperties);
          cy.createTempUser([]).then((assignUserProperties) => {
            Object.assign(assignUser, assignUserProperties);
            cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
            cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
            cy.assignAffiliationToUser(Affiliations.College, assignUser.userId);
            cy.assignAffiliationToUser(Affiliations.University, assignUser.userId);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [testData.centralRoleNameA, testData.centralRoleNameB].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                centralRoleIds.push(role.id);
              });
            });
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [testData.collegeRoleNameA, testData.collegeRoleNameB].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                collegeRoleIds.push(role.id);
              });
            });
            cy.setTenant(Affiliations.University);
            cy.wait(10_000);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [testData.universityRoleNameA, testData.universityRoleNameB].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                universityRoleIds.push(role.id);
              });
            });
          });
        });
      });

      before('Assign roles, login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.addRolesToNewUserApi(assignUser.userId, centralRoleIds);
        cy.verifyAssignedRolesCountForUserApi(assignUser.userId, centralRoleIds.length);
        cy.setTenant(Affiliations.College);
        cy.addRolesToNewUserApi(assignUser.userId, collegeRoleIds);
        cy.verifyAssignedRolesCountForUserApi(assignUser.userId, collegeRoleIds.length);
        cy.setTenant(Affiliations.University);
        cy.addRolesToNewUserApi(assignUser.userId, universityRoleIds);
        cy.verifyAssignedRolesCountForUserApi(assignUser.userId, universityRoleIds.length);
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(testUser.username, testUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          cy.reload();
          Users.waitLoading();
        }, 20_000);
      });

      after('Delete users, roles', () => {
        cy.resetTenant();
        cy.getAdminToken();
        centralRoleIds.forEach((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
        Users.deleteViaApi(testUser.userId);
        Users.deleteViaApi(assignUser.userId);
        cy.setTenant(Affiliations.College);
        collegeRoleIds.forEach((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
        cy.setTenant(Affiliations.University);
        universityRoleIds.forEach((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C514916 Unassigning roles when editing a user in Central tenant (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C514916'] },
        () => {
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('2');
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.removeOneRole(testData.centralRoleNameA);
          UserEdit.verifyUserRoleNames([testData.centralRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(1);
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.removeOneRole(testData.collegeRoleNameA);
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(1);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameB,
          ]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.unassignAllRoles();
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyUserRolesCounter('1');

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(1);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(1);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRolesAccordionEmpty();

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(1);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(1);

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('1');
          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('1');
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRoleNames([testData.centralRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(1);
          UserEdit.unassignAllRoles();
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyUserRolesCounter('0');
        },
      );
    });
  });
});
