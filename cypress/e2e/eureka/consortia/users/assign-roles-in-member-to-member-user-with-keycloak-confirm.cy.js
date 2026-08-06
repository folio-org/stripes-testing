import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleA: `AT_C1347150_UserRole_CA_${randomPostfix}`,
        centralRoleB: `AT_C1347150_UserRole_CB_${randomPostfix}`,
        collegeRoleA: `AT_C1347150_UserRole_M1A_${randomPostfix}`,
        collegeRoleB: `AT_C1347150_UserRole_M1B_${randomPostfix}`,
        universityRoleA: `AT_C1347150_UserRole_M2A_${randomPostfix}`,
      };

      const capabSetsToAssignCentral = [
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsEdit,
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiUsersRolesManage,
      ];

      const capabSetsToAssignMember = [
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiUsersRolesManage,
      ];

      const testUser = {};
      const users = {};
      const userBodies = {};
      const centralRoleIds = [];
      const collegeRoleIds = [];
      const universityRoleIds = [];
      const assignedUserIds = [];

      ['A', 'B', 'C', 'D', 'E'].forEach((letter) => {
        userBodies[`user${letter}`] = {
          type: 'staff',
          active: true,
          username: `at_c1347150_user${letter.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1347150_LastName_${letter}_${randomPostfix}`,
            email: 'AT_C1347150@test.com',
            preferredContactTypeIds: ['002'],
          },
        };
      });

      before('Create users, roles', () => {
        cy.getAdminToken();

        // Create testUser and Users A-E in College (Member-1) — testUser home = College
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
        });
        cy.getUserGroups().then((groupId) => {
          ['userA', 'userB', 'userC', 'userD', 'userE'].forEach((key) => {
            userBodies[key].patronGroup = groupId;
            Users.createViaApi(userBodies[key]).then((user) => {
              users[key] = {
                userId: user.id,
                username: userBodies[key].username,
                lastName: userBodies[key].personal.lastName,
              };
              assignedUserIds.push(user.id);
            });
          });
        });
        cy.then(() => {
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
        });
        [testData.collegeRoleA, testData.collegeRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => collegeRoleIds.push(role.id));
        });

        // Reset to Central: assign Central caps, Central roles, and University affiliations
        cy.resetTenant();
        cy.then(() => {
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, users.userE.userId);
        });
        [testData.centralRoleA, testData.centralRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => centralRoleIds.push(role.id));
        });

        // Switch to University (Member-2): assign testUser capabilities and create University roles
        cy.then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          cy.createAuthorizationRoleApi(testData.universityRoleA).then((role) => {
            universityRoleIds.push(role.id);
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.login(testUser.username, testUser.password, {
          path: `${TopMenu.usersPath}/view/${users.userA.userId}`,
          waiter: UsersCard.waitLoading,
        });
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        centralRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testUser.userId);
        assignedUserIds.forEach((id) => Users.deleteViaApi(id));
        collegeRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        cy.setTenant(Affiliations.University);
        universityRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
      });

      it(
        'C1347150 ECS | Assign authorization roles in Member tenant to a user created in Member tenant, confirming user creation in Keycloak (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C1347150'] },
        () => {
          // Steps 1-3: User A — assign Member-1 role; Keycloak modal → Cancel → roles count stays 0
          UsersCard.verifyUserLastFirstNameInCard(users.userA.lastName);
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');

          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userA.lastName);
          UserEdit.clickCancelInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');

          // Steps 4-5: User A — assign Member-1 role again; Keycloak modal → Confirm → role saved
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userA.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Step 6: User B — assign Central role only; no Keycloak modal
          cy.visit(`${TopMenu.usersPath}/view/${users.userB.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userB.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 7-8: User C — assign Central first then Member-1; Keycloak modal for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userC.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userC.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userC.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 9-10: User D — assign Member-1 first then Central; Keycloak modal for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userD.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userD.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userD.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 11-12: User E (3 affiliations) — assign Member-1 + Central + Member-2; Keycloak modal for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userE.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userE.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userE.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Step 13: User E again — assign additional Member-1 + Central roles; no Keycloak modal
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleB]);
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.centralRoleB);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.centralRoleB]);
          UserEdit.saveEditedUser();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA, testData.collegeRoleB]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA, testData.centralRoleB]);
        },
      );
    });
  });
});
