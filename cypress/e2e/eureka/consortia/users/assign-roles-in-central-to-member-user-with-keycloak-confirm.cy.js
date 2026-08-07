import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        centralRoleA: `AT_C1347151_UserRole_CA_${randomPostfix}`,
        centralRoleB: `AT_C1347151_UserRole_CB_${randomPostfix}`,
        collegeRoleA: `AT_C1347151_UserRole_M1A_${randomPostfix}`,
        collegeRoleB: `AT_C1347151_UserRole_M1B_${randomPostfix}`,
        universityRoleA: `AT_C1347151_UserRole_M2A_${randomPostfix}`,
        universityRoleB: `AT_C1347151_UserRole_M2B_${randomPostfix}`,
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

      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((letter) => {
        userBodies[`user${letter}`] = {
          type: 'staff',
          active: true,
          username: `at_c1347151_user${letter.toLowerCase()}_${randomPostfix}`,
          personal: {
            lastName: `AT_C1347151_LastName_${letter}_${randomPostfix}`,
            email: 'AT_C1347151@test.com',
            preferredContactTypeIds: ['002'],
          },
        };
      });

      before('Create users, roles', () => {
        cy.getAdminToken();

        // Create test (admin) user in Central
        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
          cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
          cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        });

        // Create Central roles
        [testData.centralRoleA, testData.centralRoleB].forEach((roleName) => {
          cy.createAuthorizationRoleApi(roleName).then((role) => centralRoleIds.push(role.id));
        });

        // Switch to College (Member-1): create Users A-H without Keycloak records and College roles
        cy.then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          cy.getUserGroups().then((groupId) => {
            ['userA', 'userB', 'userC', 'userD', 'userE', 'userF', 'userG', 'userH'].forEach(
              (key) => {
                userBodies[key].patronGroup = groupId;
                Users.createViaApi(userBodies[key]).then((user) => {
                  users[key] = {
                    userId: user.id,
                    username: userBodies[key].username,
                    lastName: userBodies[key].personal.lastName,
                  };
                  assignedUserIds.push(user.id);
                });
              },
            );
          });
          [testData.collegeRoleA, testData.collegeRoleB].forEach((roleName) => {
            cy.createAuthorizationRoleApi(roleName).then((role) => collegeRoleIds.push(role.id));
          });
        });

        // Switch to University (Member-2): create University roles
        cy.then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
          [testData.universityRoleA, testData.universityRoleB].forEach((roleName) => {
            cy.createAuthorizationRoleApi(roleName).then((role) => universityRoleIds.push(role.id));
          });

          // Reset to Central to assign University affiliation to Users E-H
          cy.resetTenant();
          ['userE', 'userF', 'userG', 'userH'].forEach((key) => {
            cy.assignAffiliationToUser(Affiliations.University, users[key].userId);
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
        Users.deleteViaApi(testUser.userId);
        cy.setTenant(Affiliations.College);
        assignedUserIds.forEach((id) => Users.deleteViaApi(id));
        collegeRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
        cy.setTenant(Affiliations.University);
        universityRoleIds.forEach((id) => cy.deleteAuthorizationRoleApi(id, true));
      });

      it(
        'C1347151 ECS | Assign authorization roles in Central tenant to a user created in Member tenant, confirming user creation in Keycloak (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C1347151'] },
        () => {
          // Steps 1-2: User A — assign Central role only; no Keycloak modal
          UsersCard.verifyUserLastFirstNameInCard(users.userA.lastName);
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');

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
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);

          // Steps 3-4: User B — assign College role; Keycloak modal expected for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userB.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userB.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userB.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('2');
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRolesAccordionEmpty();
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 5-6: User C — assign Central first, then College; Keycloak modal for Member-1
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
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 7-8: User D — assign College first, then Central; Keycloak modal for Member-1
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
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 9-10: User E (3 affiliations) — assign College + Central + University; Keycloak modal for Member-1
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
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Steps 11-12: User F (3 affiliations) — assign University + Central + College; Keycloak modal for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userF.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userF.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
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
          UserEdit.checkPromoteUserModal(users.userF.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);

          // Step 13: User F again — assign additional College + Central roles; no Keycloak modal (already created)
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
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA, testData.centralRoleB]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA, testData.collegeRoleB]);

          // Step 14-15: Switch to University affiliation; User G — assign College + University; Keycloak modal for Member-1
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          Users.waitLoading();
          cy.visit(`${TopMenu.usersPath}/view/${users.userG.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userG.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.collegeRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.collegeRoleA]);
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
          UserEdit.saveUserEditForm();
          UserEdit.checkPromoteUserModal(users.userG.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);

          // Steps 16-17: User H — assign University + College + Central; Keycloak modal for Member-1
          cy.visit(`${TopMenu.usersPath}/view/${users.userH.userId}`);
          UsersCard.waitLoading();
          UsersCard.verifyUserLastFirstNameInCard(users.userH.lastName);
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.selectRolesAffiliation(tenantNames.university);
          UserEdit.clickAddUserRolesButton();
          UserEdit.selectRoleInModal(testData.universityRoleA);
          UserEdit.saveAndCloseRolesModal();
          UserEdit.verifyUserRoleNames([testData.universityRoleA]);
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
          UserEdit.checkPromoteUserModal(users.userH.lastName);
          UserEdit.clickConfirmInPromoteUserModal();
          UsersCard.waitLoading();
          UsersCard.verifyAffiliationsQuantity('3');
          UsersCard.verifyUserRolesCounter('1');
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.university);
          UsersCard.verifyUserRoleNames([testData.universityRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleNames([testData.collegeRoleA]);
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleNames([testData.centralRoleA]);
        },
      );
    });
  });
});
