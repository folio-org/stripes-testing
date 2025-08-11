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
        centralRoleNameA: `AT_C514904_UserRole_CA_${randomPostfix}`,
        centralRoleNameB: `AT_C514904_UserRole_CB_${randomPostfix}`,
        centralRoleNameC: `AT_C514904_UserRole_CC_${randomPostfix}`,
        collegeRoleNameA: `AT_C514904_UserRole_M1A_${randomPostfix}`,
        collegeRoleNameB: `AT_C514904_UserRole_M1B_${randomPostfix}`,
        collegeRoleNameC: `AT_C514904_UserRole_M1C_${randomPostfix}`,
        universityRoleNameA: `AT_C514904_UserRole_M2A_${randomPostfix}`,
        universityRoleNameB: `AT_C514904_UserRole_M2B_${randomPostfix}`,
        universityRoleNameC: `AT_C514904_UserRole_M2C_${randomPostfix}`,
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
            [
              testData.centralRoleNameA,
              testData.centralRoleNameB,
              testData.centralRoleNameC,
            ].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                centralRoleIds.push(role.id);
              });
            });
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [
              testData.collegeRoleNameA,
              testData.collegeRoleNameB,
              testData.collegeRoleNameC,
            ].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                collegeRoleIds.push(role.id);
              });
            });
            cy.setTenant(Affiliations.University);
            cy.wait(10_000);
            cy.assignCapabilitiesToExistingUser(testUser.userId, capabsToAssign, capabSetsToAssign);
            [
              testData.universityRoleNameA,
              testData.universityRoleNameB,
              testData.universityRoleNameC,
            ].forEach((roleName) => {
              cy.createAuthorizationRoleApi(roleName).then((role) => {
                universityRoleIds.push(role.id);
              });
            });
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(testUser.username, testUser.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.reload();
        }, 20_000);
        Users.waitLoading();
      });

      after('Delete roles, users', () => {
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
        'C514904 Add/update roles when editing a user in Member tenant (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C514904'] },
        () => {
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('0');
          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('0');
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.collegeRoleNameA);
          UserEdit.selectRoleInModal(testData.collegeRoleNameB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.centralRoleNameA);
          UserEdit.selectRoleInModal(testData.centralRoleNameB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.verifyUserRolesAccordionEmpty();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.universityRoleNameA);
          UserEdit.selectRoleInModal(testData.universityRoleNameB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameB,
          ]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(2);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UsersCard.verifyUserRolesRowsCount(2);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameB,
          ]);
          UsersCard.verifyUserRolesRowsCount(2);

          UserEdit.openEdit();
          UserEdit.verifyUserRolesCounter('2');
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameB]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.collegeRoleNameB, false);
          UserEdit.selectRoleInModal(testData.collegeRoleNameC);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameC]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameB]);
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.centralRoleNameB, false);
          UserEdit.selectRoleInModal(testData.centralRoleNameC);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameC]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameB,
          ]);
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.selectRoleInModal(testData.universityRoleNameB, false);
          UserEdit.selectRoleInModal(testData.universityRoleNameC);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameC,
          ]);
          UserEdit.verifyUserRolesRowsCount(2);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyUserRolesCounter('2');

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameC,
          ]);
          UsersCard.verifyUserRolesRowsCount(2);

          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUser.username);
          UsersSearchPane.openUser(assignUser.username);
          UsersCard.verifyUserRolesCounter('2');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleNameA, testData.centralRoleNameC]);
          UsersCard.verifyUserRolesRowsCount(2);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleNameA, testData.collegeRoleNameC]);
          UsersCard.verifyUserRolesRowsCount(2);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([
            testData.universityRoleNameA,
            testData.universityRoleNameC,
          ]);
          UsersCard.verifyUserRolesRowsCount(2);
        },
      );
    });
  });
});
